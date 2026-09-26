-- liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:refresh_mv_size_profile_hierarchy_ranges_add_security_definer runOnChange:true stripComments:false splitStatements:false context:add_security_definer labels:uat_release_1_0_changes
-- comment: initial changeset for refresh_mv_size_profile_hierarchy_ranges 

DROP FUNCTION IF EXISTS size_smart.refresh_mv_size_profile_hierarchy_ranges();

CREATE OR REPLACE FUNCTION size_smart.refresh_mv_size_profile_hierarchy_ranges()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY size_smart.mv_size_profile_hierarchy_ranges;
END;
$$;

COMMENT ON FUNCTION size_smart.refresh_mv_size_profile_hierarchy_ranges() IS
'Refreshes the size profile hierarchy ranges materialized view concurrently';
