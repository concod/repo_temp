--liquibase formatted sql
--changeset yashraj.jhaa@impactanalytics.co:fn_update_store_uam_hierarchy_ids_1 stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:uam_hierarchy_security
--comment: changeset for base_pricing.fn_update_store_uam_hierarchy_ids_1

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_update_store_uam_hierarchy_ids;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_update_store_uam_hierarchy_ids()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_concat_cids  TEXT;
    v_concat_names TEXT;
    v_update_sql   TEXT;
BEGIN
    -- IDs → underscore separated
    SELECT
        'CONCAT_WS(''_'', ' || STRING_AGG(
            'COALESCE(' || bp_hierarchy_id || '::TEXT, '''')',
            ', ' ORDER BY level_order
        ) || ')'
    INTO v_concat_cids
    FROM base_pricing_restaurant.bp_uam_store_hierarchy_levels
    WHERE is_active = TRUE;

    -- Names → direct concatenation (NO underscore)
    SELECT
        STRING_AGG(
            'COALESCE(' || bp_hierarchy_name || ', '''')',
            ' || ' ORDER BY level_order
        )
    INTO v_concat_names
    FROM base_pricing_restaurant.bp_uam_store_hierarchy_levels
    WHERE is_active = TRUE;

    v_update_sql := FORMAT(
        'UPDATE base_pricing_restaurant.bp_store_master
         SET uam_heirarchy_id = %s,
             uam_heirarchy_name = %s',
        v_concat_cids,
        v_concat_names
    );

    EXECUTE v_update_sql;
END;
$$;
