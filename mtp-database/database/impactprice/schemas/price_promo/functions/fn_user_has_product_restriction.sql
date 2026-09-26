--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:fn_user_has_product_restriction runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_user_has_product_restriction

DROP FUNCTION if exists price_promo.fn_user_has_product_restriction;

CREATE OR REPLACE FUNCTION price_promo.fn_user_has_product_restriction(
    p_user_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_access_hierarchy JSONB;
BEGIN
    -- Get access hierarchy from user access hierarchy mapping
    select 
        access_hierarchy into v_access_hierarchy 
    from 
        global.user_access_hierarchy_mapping where user_code = p_user_id
        and acl_code in (
            select acl_code from global.acl_master 
            where application_code = (
                select config_value::integer 
                from price_promo.tb_tool_configurations 
                where module = 'application' and config_name = 'application_code'
            )
        );
    -- If no access hierarchy, return false
    IF v_access_hierarchy = '[]'::jsonb OR jsonb_array_length(v_access_hierarchy) = 0 THEN
        return false;
    -- If access hierarchy exists, return true
    else
        return true;
    END IF;
END;
$function$;
