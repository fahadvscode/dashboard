-- Verify project_id column exists in all lead tables
-- and check sample data to see if values are NULL

-- Check fj_leads table structure and data
SELECT 
    'fj_leads' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'fj_leads' 
AND column_name IN ('project_id', 'project_name', 'redirect_link')
ORDER BY column_name;

-- Check precon_factory_leads table structure
SELECT 
    'precon_factory_leads' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'precon_factory_leads' 
AND column_name IN ('project_id', 'project_name', 'redirect_link')
ORDER BY column_name;

-- Check gta_lowrise_leads table structure
SELECT 
    'gta_lowrise_leads' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'gta_lowrise_leads' 
AND column_name IN ('project_id', 'project_name', 'redirect_link')
ORDER BY column_name;

-- Check recent lead data to see actual values
SELECT 
    'fj_leads' as source,
    id,
    firstname,
    lastname,
    project_name,
    project_id,
    redirect_link,
    created_at
FROM fj_leads
ORDER BY created_at DESC
LIMIT 5;

SELECT 
    'precon_factory_leads' as source,
    id,
    firstname,
    lastname,
    project_name,
    project_id,
    redirect_link,
    created_at
FROM precon_factory_leads
ORDER BY created_at DESC
LIMIT 5;

SELECT 
    'gta_lowrise_leads' as source,
    id,
    firstname,
    lastname,
    project_name,
    project_id,
    redirect_link,
    created_at
FROM gta_lowrise_leads
ORDER BY created_at DESC
LIMIT 5;

-- Show statistics on NULL project_id values
SELECT 
    'fj_leads' as table_name,
    COUNT(*) as total_leads,
    COUNT(project_id) as leads_with_project_id,
    COUNT(*) - COUNT(project_id) as leads_without_project_id,
    ROUND(100.0 * COUNT(project_id) / NULLIF(COUNT(*), 0), 2) as percentage_with_id
FROM fj_leads

UNION ALL

SELECT 
    'precon_factory_leads' as table_name,
    COUNT(*) as total_leads,
    COUNT(project_id) as leads_with_project_id,
    COUNT(*) - COUNT(project_id) as leads_without_project_id,
    ROUND(100.0 * COUNT(project_id) / NULLIF(COUNT(*), 0), 2) as percentage_with_id
FROM precon_factory_leads

UNION ALL

SELECT 
    'gta_lowrise_leads' as table_name,
    COUNT(*) as total_leads,
    COUNT(project_id) as leads_with_project_id,
    COUNT(*) - COUNT(project_id) as leads_without_project_id,
    ROUND(100.0 * COUNT(project_id) / NULLIF(COUNT(*), 0), 2) as percentage_with_id
FROM gta_lowrise_leads;

-- Check the current notify_new_lead function to see what it's sending
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'notify_new_lead';
