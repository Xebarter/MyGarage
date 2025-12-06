-- Migration: Add `documents` table and storage setup for Documents & Insurance UI
-- Generated: 2025-12-05

/*
  Purpose:
  - Create a `documents` table that matches the fields used by the frontend
    component `DocumentsAndInsurance.tsx` (it expects `.from('documents')`).
  - Add indexes, RLS policies for authenticated users and admins.
  - Provide an optional migration from existing `vehicle_documents` -> `documents`.
  - Provide guidance/SQL for making a Supabase Storage bucket `documents` public.

  Notes:
  - The application stores a `customer_id` in localStorage and uses that to
    query `.from('documents')`. This table maps `customer_id` -> `customers.id`.
  - If your application ties customers to `auth.users`, consider replacing
    `customer_id` with `user_id` foreign key to `public_users` or populate
    `customers.auth_id` and use that in policies. The RLS policy below assumes
    `customer_id` may equal `auth.uid()` for authenticated public users; adjust
    if your auth mapping is different.
*/

-- 1) Create `documents` table used by frontend
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- store UUIDs for customer/vehicle but add FK constraints conditionally below
  customer_id uuid,
  vehicle_id uuid,
  type text NOT NULL CHECK (type IN ('insurance', 'inspection_report', 'logbook', 'driving_permit', 'other')),
  name text NOT NULL,
  file_url text NOT NULL,
  file_path text, -- path within storage bucket (used for deletion)
  file_name text,
  file_size integer,
  file_type text,
  expiry_date date,
  uploaded_at timestamptz DEFAULT now(),
  notes text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Indexes for common queries used by the UI
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle_id ON documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);

-- 3) Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 4) RLS policies
-- Allow admins to manage all documents
DROP POLICY IF EXISTS "Admins can manage documents" ON documents;
CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "Customers can view their documents" ON documents;
CREATE POLICY "Customers can view their documents"
  ON documents FOR SELECT
  USING (
    customer_id = auth.uid() OR EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "Customers can insert their documents" ON documents;
CREATE POLICY "Customers can insert their documents"
  ON documents FOR INSERT
  WITH CHECK (
    customer_id = auth.uid() OR EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "Customers can manage their documents" ON documents;
CREATE POLICY "Customers can manage their documents"
  ON documents FOR UPDATE
  USING (
    customer_id = auth.uid() OR EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid())
  )
  WITH CHECK (
    customer_id = auth.uid() OR EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid())
  );

DROP POLICY IF EXISTS "Customers can delete their documents" ON documents;
CREATE POLICY "Customers can delete their documents"
  ON documents FOR DELETE
  USING (
    customer_id = auth.uid() OR EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid())
  );

-- 5) Grant minimal privileges (note RLS still applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;

-- 6) Optional: migrate existing `vehicle_documents` records into `documents`
-- This attempts to copy data already present in `vehicle_documents` into
-- the new `documents` table. Run once and verify results. If you prefer manual
-- migration, comment out the INSERT below.
INSERT INTO documents (id, customer_id, vehicle_id, type, name, file_url, file_path, file_name, file_size, file_type, expiry_date, uploaded_at, notes, created_at, updated_at)
SELECT id,
       user_id AS customer_id,
       vehicle_id,
       document_type AS type,
       title AS name,
       file_url,
       NULLIF(NULLIF(file_name, ''), NULL) AS file_path, -- best-effort: if you stored path in file_name
       file_name,
       file_size,
       file_type,
       expiry_date,
       uploaded_at,
       description AS notes,
       uploaded_at AS created_at,
       updated_at
FROM vehicle_documents vd
ON CONFLICT (id) DO NOTHING;

-- 7) Conditionally add foreign key constraints if referenced tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'customers' AND relkind = 'r') THEN
    ALTER TABLE documents
      ADD CONSTRAINT fk_documents_customer
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'vehicles' AND relkind = 'r') THEN
    ALTER TABLE documents
      ADD CONSTRAINT fk_documents_vehicle
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 7) Optional: If you want the `file_path` to exactly match the storage path used
-- by the frontend (for deletion), you might need to UPDATE the column above
-- after verifying how file paths are stored in `vehicle_documents`.

-- 8) Storage bucket guidance (Supabase Storage)
-- NOTE: creating a storage bucket is typically performed via Supabase UI, CLI
-- or API. If you prefer to do it via SQL and your Supabase project exposes the
-- `storage.buckets` table, you can mark an existing bucket public like this:
-- (This does NOT create the bucket; it only toggles visibility if it already exists.)

-- Make the `documents` bucket public so `getPublicUrl` returns a usable url
-- UPDATE storage.buckets SET public = true WHERE name = 'documents';

-- If your project doesn't have the bucket yet, create it using the Supabase
-- CLI or Dashboard, or run the storage API. Example (Supabase CLI):
-- supabase storage create-bucket documents --public

-- 9) Optional: cleanup trigger to attempt removing storage.object rows when a
-- documents row is deleted. This is best-effort and depends on whether you
-- want to manage storage via SQL. Use with caution.
--
-- CREATE OR REPLACE FUNCTION cleanup_documents_storage()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF OLD.file_path IS NOT NULL THEN
--     -- If your Postgres role has permission to modify storage.objects, you
--     -- could delete the object metadata row here. Many projects perform
--     -- object deletion client-side instead to ensure proper storage API calls.
--     DELETE FROM storage.objects
--     WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'documents' LIMIT 1)
--       AND name = OLD.file_path;
--   END IF;
--   RETURN OLD;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- DROP TRIGGER IF EXISTS documents_cleanup_storage ON documents;
-- CREATE TRIGGER documents_cleanup_storage
--   AFTER DELETE ON documents
--   FOR EACH ROW EXECUTE FUNCTION cleanup_documents_storage();

-- 10) Final note: Verify the mapping between `customers.id` and `auth.uid()` in
-- your app. If your app uses `public_users` (auth-linked) and stores `auth_id`
-- on `public_users`, consider using `public_users` and a `user_id` foreign key
-- instead of `customer_id`, or populate `customers.auth_id` and update policies
-- to use that field.

-- End of migration
