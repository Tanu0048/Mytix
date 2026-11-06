-- Lets one booking contain several ticket categories (e.g. 2 VIP + 2 Standard seats).
-- Holds created together share a group_id. Existing rows keep NULL (single-category bookings).
--
-- Safe to run on a live database: it only ADDS a nullable column and an index.
-- No existing data is changed or deleted. Running it twice is harmless.
--
-- IMPORTANT: run this BEFORE deploying the backend that includes the "group_id" field,
-- otherwise hold queries will fail because the column does not exist yet.

ALTER TABLE inventory_holds ADD COLUMN IF NOT EXISTS group_id uuid NULL;

CREATE INDEX IF NOT EXISTS inventory_holds_group_id_idx ON inventory_holds (group_id);

-- Rollback (only if needed, after rolling the backend back first):
-- DROP INDEX IF EXISTS inventory_holds_group_id_idx;
-- ALTER TABLE inventory_holds DROP COLUMN IF EXISTS group_id;
