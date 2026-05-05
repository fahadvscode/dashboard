-- Optional map pin data for canada_properties (Project Collections map view)
-- Run in Supabase SQL Editor once.

ALTER TABLE canada_properties
  ADD COLUMN IF NOT EXISTS map_address TEXT,
  ADD COLUMN IF NOT EXISTS map_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS map_lng DOUBLE PRECISION;

COMMENT ON COLUMN canada_properties.map_address IS 'Optional address override for map geocoding when main address is missing or unclear';
COMMENT ON COLUMN canada_properties.map_lat IS 'Cached latitude from geocoding (optional)';
COMMENT ON COLUMN canada_properties.map_lng IS 'Cached longitude from geocoding (optional)';
