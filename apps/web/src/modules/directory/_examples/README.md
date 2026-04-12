# School Directory Examples

The school directory module stores entries in the database, not in
Markdown files. Entries are created by families themselves via the
directory form — this is an opt-in system with no admin-seeded content.

## Privacy Model

- Entries are only visible to authenticated members of the same school
- Anonymous users see a "sign in required" prompt
- Families can hide their entry (visible = false) without deleting it
- Admins can see all entries including hidden ones

## Demo

In development mode with `supabase start`, you can create test entries
by signing in as a test user and using the directory form.
