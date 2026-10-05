-- Add is_archived column to sessions table
-- This enables the V1 Session Lifecycle (archive/restore) feature

ALTER TABLE sessions
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
