-- liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:mv_hierarchy_size_ranges_modification_changeset_02 runOnChange:true stripComments:false splitStatements:false context:uat_release_1_0_changes_02 labels:uat_release_1_0_changes_02
-- comment: initial changeset for mv_hierarchy_size_ranges_modification_changeset_01

DROP FUNCTION IF EXISTS size_smart.refresh_mv_hierarchy_size_ranges();
CREATE OR REPLACE FUNCTION size_smart.refresh_mv_hierarchy_size_ranges()
RETURNS void
LANGUAGE plpgsql
security definer 
AS $$
BEGIN
    -- Refresh materialized view concurrently for minimal locking
    REFRESH MATERIALIZED VIEW CONCURRENTLY size_smart.mv_hierarchy_size_ranges;
    
    -- Optionally, you can log success here if you want, e.g.
    -- RAISE NOTICE 'Refreshed mv_hierarchy_size_ranges successfully at %', now();
    
EXCEPTION WHEN OTHERS THEN
    -- Raise error so caller knows something failed
    RAISE EXCEPTION 'Failed to refresh mv_hierarchy_size_ranges: %', SQLERRM;
END;
$$;