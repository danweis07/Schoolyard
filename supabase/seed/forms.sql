-- ============================================================
-- forms.sql — Demo forms for Longfellow Elementary
-- ============================================================
-- Depends on: the demo school row in public.schools
-- Run AFTER the main seed.sql or as part of supabase db reset.
--
-- We use a CTE to look up the school_id by slug so these inserts
-- are portable across environments.

-- Stable UUIDs for seed data (generated once, never change)
-- form_field_trip:   a1b2c3d4-1111-4000-8000-000000000001
-- form_emergency:    a1b2c3d4-1111-4000-8000-000000000002

with school as (
  select id from public.schools where slug = 'longfellow' limit 1
)
insert into public.forms (id, school_id, slug, title, description, fields, target_grades, due_date, published, created_at, updated_at)
values
  (
    'a1b2c3d4-1111-4000-8000-000000000001',
    (select id from school),
    'fall-field-trip-permission',
    'Fall Field Trip Permission Slip',
    'Please complete this form to grant permission for your child to attend the Fall Field Trip. All fields marked as required must be filled out before the due date.',
    '[
      {"name": "student_name", "label": "Student Name", "type": "text", "required": true, "placeholder": "First and last name"},
      {"name": "emergency_contact", "label": "Emergency Contact Phone", "type": "text", "required": true, "placeholder": "(555) 123-4567"},
      {"name": "allergies", "label": "Allergies or Medical Conditions", "type": "textarea", "required": false, "placeholder": "List any allergies, medications, or conditions we should be aware of"},
      {"name": "photo_permission", "label": "I grant permission for my child to be photographed during the field trip", "type": "checkbox", "required": false},
      {"name": "parent_signature", "label": "Parent/Guardian Signature", "type": "signature", "required": true}
    ]'::jsonb,
    '{3rd,4th,5th}',
    (current_date + interval '14 days')::date,
    true,
    now(),
    now()
  ),
  (
    'a1b2c3d4-1111-4000-8000-000000000002',
    (select id from school),
    'emergency-contact-update-2025-2026',
    'Emergency Contact Update 2025-2026',
    'Please verify and update your emergency contact information for the current school year. This information is critical for your child''s safety.',
    '[
      {"name": "student_name", "label": "Student Name", "type": "text", "required": true, "placeholder": "First and last name"},
      {"name": "parent_name", "label": "Parent/Guardian Name", "type": "text", "required": true, "placeholder": "Full name"},
      {"name": "phone", "label": "Primary Phone Number", "type": "text", "required": true, "placeholder": "(555) 123-4567"},
      {"name": "email", "label": "Email Address", "type": "text", "required": true, "placeholder": "parent@example.com"},
      {"name": "alternate_contact", "label": "Alternate Emergency Contact", "type": "text", "required": false, "placeholder": "Name and phone number"},
      {"name": "medical_notes", "label": "Medical Notes", "type": "textarea", "required": false, "placeholder": "Any medical conditions, medications, or special instructions"}
    ]'::jsonb,
    '{}',
    null,
    true,
    now(),
    now()
  )
on conflict (school_id, slug) do nothing;
