-- Project Collections: Create tables for curated project compilations grouped by company (FJ / Precon Factory)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Table: project_collections
-- Stores each collection with name, optional city tag, and company (fj | precon_factory)
CREATE TABLE IF NOT EXISTS project_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  company TEXT NOT NULL CHECK (company IN ('fj', 'precon_factory')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: collection_projects
-- Links collections to properties (many-to-many)
CREATE TABLE IF NOT EXISTS collection_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES project_collections(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, property_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_collection_projects_collection ON collection_projects(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_projects_property ON collection_projects(property_id);
CREATE INDEX IF NOT EXISTS idx_project_collections_company ON project_collections(company);

-- Enable RLS (Row Level Security) - adjust policies as needed for your auth
ALTER TABLE project_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_projects ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (matches your current dashboard setup with password auth)
CREATE POLICY "Allow all for project_collections" ON project_collections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for collection_projects" ON collection_projects FOR ALL USING (true) WITH CHECK (true);

-- Optional: Update collection's updated_at when projects are added/removed
CREATE OR REPLACE FUNCTION update_collection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE project_collections SET updated_at = NOW() WHERE id = OLD.collection_id;
  ELSE
    UPDATE project_collections SET updated_at = NOW() WHERE id = NEW.collection_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_projects_timestamp
  AFTER INSERT OR DELETE ON collection_projects
  FOR EACH ROW EXECUTE FUNCTION update_collection_timestamp();
