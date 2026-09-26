--liquibase formatted sql
--changeset liquibase:product_rule_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_rule_dc_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_dc_mapping(input refcursor, text, character varying[], integer[], integer[]);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_dc_mapping(
    input refcursor, 
    text, 
    character varying[], 
    integer[], 
    integer[]
) 
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text := '';
    _cache_payload jsonb := jsonb_build_object('article', $2, 'channel', $3, 'available_list', $4, 'default_list', $5);
BEGIN
    _query_combine := 'SELECT 
          dc.dc_code, 
          dc.name, 
          CASE WHEN mdc.selected_dc_code IS NULL THEN false ELSE true END AS mapped 
        FROM 
          global.distribution_centres dc
          LEFT JOIN (
            SELECT 
              unnest(''' || concat($5) || '''::int[]) AS selected_dc_code
          ) mdc ON mdc.selected_dc_code = dc.dc_code
          JOIN global.store_attributes_filter saf ON saf.dc_code = dc.dc_code 
        WHERE 
          dc.is_active = true 
          AND dc.is_deleted = false
          AND saf.channel = ANY(''' || concat($3) || '''::varchar[])
        ORDER BY 
          mapped DESC';

    RAISE NOTICE '%', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;
    RETURN $1;
END
$function$;