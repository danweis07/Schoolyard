-- 0006_functions.sql
-- RPC helpers, triggers, and the public-facing donation aggregate view.

-- current_school_id ─ the logged-in user's primary school, for RPCs
-- that want to avoid passing an explicit school_id.
create or replace function public.current_school_id()
returns uuid language sql stable as $$
  select school_id from public.profiles where id = auth.uid();
$$;

-- increment_listing_flag ─ called by the "Report" button. Idempotent on
-- the listing side (increments the counter); the actual flag row is
-- inserted separately via the community_flags INSERT policy.
create or replace function public.increment_listing_flag(p_listing uuid)
returns void language plpgsql security definer as $$
begin
  update public.community_listings
     set flagged_count = flagged_count + 1,
         hidden = case when flagged_count + 1 >= 3 then true else hidden end
   where id = p_listing;
end;
$$;

revoke all on function public.increment_listing_flag(uuid) from public;
grant execute on function public.increment_listing_flag(uuid) to authenticated;

-- event_capacity_remaining ─ how many seats are still open for an event.
-- Returns NULL for events without a configured capacity (unlimited).
create or replace function public.event_capacity_remaining(p_event uuid)
returns integer language sql stable as $$
  with evt as (select capacity from public.events where id = p_event),
       taken as (
         select coalesce(sum(1 + guests), 0)::int as n
           from public.event_rsvps
          where event_id = p_event and status = 'going'
       )
  select case
           when (select capacity from evt) is null then null
           else greatest((select capacity from evt) - (select n from taken), 0)
         end;
$$;

grant execute on function public.event_capacity_remaining(uuid) to anon, authenticated;

-- handle_new_user ─ auto-create a profile row whenever Supabase Auth
-- creates a user. School/role are left null and district_admin fills
-- them in via the admin panel.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', null), 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- fundraising_program_totals ─ the public face of donations. Individual
-- rows are blocked by RLS; this view exposes aggregates only.
create or replace view public.fundraising_program_totals as
  select
    program_id,
    school_id,
    sum(amount_cents)::bigint as raised_cents
    from public.fundraising_donations
   group by program_id, school_id;

grant select on public.fundraising_program_totals to anon, authenticated;

-- Refresh programs.raised_cents on every donation row inserted, so the
-- programs table stays self-consistent without forcing every reader to
-- hit the view.
create or replace function public.tg_update_program_raised()
returns trigger language plpgsql as $$
begin
  if new.program_id is not null then
    update public.programs
       set raised_cents = raised_cents + new.amount_cents
     where id = new.program_id;
  end if;
  return new;
end;
$$;

drop trigger if exists fundraising_donations_update_program on public.fundraising_donations;
create trigger fundraising_donations_update_program
  after insert on public.fundraising_donations
  for each row execute function public.tg_update_program_raised();
