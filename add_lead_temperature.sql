-- Add lead_temperature column to fj_leads table
ALTER TABLE fj_leads 
ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(10) DEFAULT 'warm';

-- Add lead_temperature column to precon_factory_leads table
ALTER TABLE precon_factory_leads 
ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(10) DEFAULT 'warm';

-- Update existing records to have default 'warm' temperature
UPDATE fj_leads SET lead_temperature = 'warm' WHERE lead_temperature IS NULL;
UPDATE precon_factory_leads SET lead_temperature = 'warm' WHERE lead_temperature IS NULL;

-- Add check constraint to ensure only valid values
ALTER TABLE fj_leads 
ADD CONSTRAINT fj_leads_temperature_check 
CHECK (lead_temperature IN ('hot', 'warm', 'cold'));

ALTER TABLE precon_factory_leads 
ADD CONSTRAINT precon_factory_leads_temperature_check 
CHECK (lead_temperature IN ('hot', 'warm', 'cold'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_fj_leads_temperature ON fj_leads(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_precon_leads_temperature ON precon_factory_leads(lead_temperature);

-- Verify the changes
SELECT 
    'fj_leads' as table_name,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN lead_temperature = 'hot' THEN 1 END) as hot_leads,
    COUNT(CASE WHEN lead_temperature = 'warm' THEN 1 END) as warm_leads,
    COUNT(CASE WHEN lead_temperature = 'cold' THEN 1 END) as cold_leads
FROM fj_leads
UNION ALL
SELECT 
    'precon_factory_leads' as table_name,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN lead_temperature = 'hot' THEN 1 END) as hot_leads,
    COUNT(CASE WHEN lead_temperature = 'warm' THEN 1 END) as warm_leads,
    COUNT(CASE WHEN lead_temperature = 'cold' THEN 1 END) as cold_leads
FROM precon_factory_leads;

