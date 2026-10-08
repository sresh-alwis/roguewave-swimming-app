-- Add is_archived column to swimmers table
-- This enables the V1 Swimmer Lifecycle (archive/restore) feature

ALTER TABLE swimmers
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
