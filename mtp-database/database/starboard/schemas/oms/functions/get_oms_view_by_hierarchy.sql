--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_view_by_hierarchy_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:90136
--comment: added the function to get the oms view by hierarchy
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_view_by_hierarchy(text);
DROP FUNCTION IF EXISTS oms.get_oms_view_by_hierarchy(text, jsonb);

CREATE OR REPLACE FUNCTION oms.get_oms_view_by_hierarchy(p_attribute_name text, view_by_allowed_values jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(attribute_name character varying, source_display_name character varying, hierarchy_level integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH attrs AS (
        SELECT *
        FROM global.product_attributes_list()
        WHERE is_hierarchy = true
    )
    SELECT 
        t1.attribute_name, 
        t1.source_display_name, 
        t1.hierarchy_level    
    FROM attrs t1
    WHERE t1.hierarchy_level <= (
        SELECT t2.hierarchy_level    
        FROM attrs t2
        WHERE t2.attribute_name = p_attribute_name
        LIMIT 1
    )
    AND (view_by_allowed_values IS NULL OR view_by_allowed_values = '[]'::jsonb OR t1.attribute_name IN (SELECT jsonb_array_elements_text(view_by_allowed_values)))
    ORDER BY t1.hierarchy_level;
END;
$function$;
