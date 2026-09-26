--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:fn_get_user_restricted_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_user_restricted_stores

DROP FUNCTION if exists price_promo.fn_get_user_restricted_stores;

CREATE OR REPLACE FUNCTION price_promo.fn_get_user_restricted_stores(p_user_id integer, p_is_active integer[] DEFAULT ARRAY[1])
 RETURNS SETOF pricesmart.tb_store_master_pricesmart_version
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _query text;
    v_access_hierarchy JSONB;
    promo_application_code INTEGER;
BEGIN

    -- Get application_code from configuration    
    select config_value::integer into promo_application_code
    from price_promo.tb_tool_configurations
    where module = 'application' and config_name = 'application_code';
    
    -- Get access hierarchy from user access hierarchy mapping
    select 
        access_hierarchy into v_access_hierarchy 
    from 
        global.user_access_hierarchy_mapping where user_code = p_user_id
        and acl_code in (
            select acl_code from global.acl_master 
            where application_code = promo_application_code
        );
        
    -- If no access hierarchy, return all stores
    IF v_access_hierarchy IS NULL OR v_access_hierarchy = '[]'::jsonb OR jsonb_array_length(v_access_hierarchy) = 0 THEN
        _query := format('
            SELECT sm.*
            FROM pricesmart.tb_store_master_pricesmart_version sm
            WHERE sm.version_code = global.get_table_version(''pricesmart.tb_store_master_pricesmart_version''::text)
                AND sm.is_active = any(%1$L)
        ', p_is_active);
        
    -- If access hierarchy exists, return stores that match the access hierarchy
    ELSE
        _query := format('
            WITH uam_hierarchy_cte AS MATERIALIZED(
                SELECT
                    DISTINCT jsonb_array_elements(uahm.access_hierarchy) ->> ''store_hierarchy_id'' AS uam_hierarchy_id
                FROM global.user_access_hierarchy_mapping uahm
                INNER JOIN global.acl_master acl
                    ON uahm.acl_code = acl.acl_code
                    AND acl.application_code = %3$s
                WHERE user_code = %1$s
            )
            SELECT sm.*
            FROM pricesmart.tb_store_master_pricesmart_version sm
            INNER JOIN uam_hierarchy_cte uhc ON uhc.uam_hierarchy_id = sm.uam_hierarchy_id
            WHERE sm.version_code = global.get_table_version(''pricesmart.tb_store_master_pricesmart_version''::text)
                AND sm.is_active = any(%2$L)', p_user_id, p_is_active, promo_application_code);
    END IF;

    raise notice 'query: %', _query;
    RETURN QUERY EXECUTE _query;
END;
$function$
;
