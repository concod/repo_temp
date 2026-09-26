-- liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:refresh_mv_style_ruleset_mapping_add_security_definer runOnChange:true stripComments:false splitStatements:false context:add_security_definer labels:uat_release_1_0_changes
-- comment: initial changeset for refresh_mv_style_ruleset_mapping  


DROP FUNCTION IF EXISTS size_smart.refresh_mv_style_ruleset_mapping();
CREATE OR REPLACE FUNCTION size_smart.refresh_mv_style_ruleset_mapping()
RETURNS void
LANGUAGE plpgsql
security definer 
AS $$
BEGIN
    -- Refresh materialized view concurrently for minimal locking
    REFRESH MATERIALIZED VIEW CONCURRENTLY size_smart.mv_style_ruleset_mapping;
    
    -- Optionally, you can log success here if you want, e.g.
    -- RAISE NOTICE 'Refreshed mv_style_ruleset_mapping successfully at %', now();
    
EXCEPTION WHEN OTHERS THEN
    -- Raise error so caller knows something failed
    RAISE EXCEPTION 'Failed to refresh mv_style_ruleset_mapping: %', SQLERRM;
END;
$$;