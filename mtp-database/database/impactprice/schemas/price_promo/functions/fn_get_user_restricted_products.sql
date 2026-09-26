--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_get_user_restricted_products runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_user_restricted_products

DROP FUNCTION if exists price_promo.fn_get_user_restricted_products;
CREATE OR REPLACE FUNCTION price_promo.fn_get_user_restricted_products(
    p_user_id integer,
    p_is_active integer[] DEFAULT ARRAY[1]
)
RETURNS SETOF price_promo.product_master_promo_version
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

    -- If no access hierarchy, return all products
    IF v_access_hierarchy is NULL OR v_access_hierarchy = '[]'::jsonb OR jsonb_array_length(v_access_hierarchy) = 0 THEN
        _query := format('
            SELECT 
                pm.*
            FROM 
                price_promo.product_master_promo_version pm
            WHERE 
                pm.version_code = global.get_table_version(''price_promo.product_master_promo_version''::text) 
                AND pm.is_active = any(%1$L)
        ', p_is_active);
        
    -- If access hierarchy exists, return products that match the access hierarchy
    else
        _query := format('
			with uam_hierarchy_cte as MATERIALIZED(
				select 
					distinct jsonb_array_elements(uahm.access_hierarchy) ->> ''product_hierarchy_id'' as uam_hiearachy_id
				from global.user_access_hierarchy_mapping uahm
				INNER JOIN global.acl_master acl
				    ON uahm.acl_code = acl.acl_code
				AND acl.application_code = %3$s where user_code = %1$s
			)
            SELECT 
                pm.*
            FROM 
                price_promo.product_master_promo_version pm
            inner join 
				uam_hierarchy_cte uhc 
			on 
				uhc.uam_hiearachy_id = pm.uam_hierarchy_id 
            WHERE 
                pm.version_code = global.get_table_version(''price_promo.product_master_promo_version''::text) 
                AND pm.is_active = any(%2$L)'
            , p_user_id, p_is_active, promo_application_code);

    END IF;

    raise notice 'query: %', _query;
    RETURN QUERY EXECUTE _query;
END;
$function$
;
