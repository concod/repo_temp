--liquibase formatted sql
--changeset liquibase:store_dc_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated changeset for store_dc_mapping_list with WHS filtering logic and fixes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_dc_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_dc_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
RETURNS text
LANGUAGE plpgsql
AS $function$
declare
    query_sm text := '';
    query_sa text := '';
    query_table_filters text := '';
    query_combine text;
    final_query text := '';
    retail_region_filter text := '';
begin
    -- Build main table query with all filters (for non-WHS stores)
    query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
    
    -- Extract retail_region filter for WHS stores (retail_region is mandatory)
    -- Extract values from the JSON structure: [{"type": "list", "operator": "in", "values": ["GCSEA"]}]
    retail_region_filter := 'saf.retail_region = ANY(ARRAY[' || 
        (SELECT string_agg(quote_literal(value), ',') 
         FROM jsonb_array_elements_text(($3->'retail_region'->0->'values'))) || '])';
    
    -- Create modified attribute filter based on WHS classification  
    query_sa := 'SELECT saf.channel, saf.dc_flag, saf.s1_name, saf.currency_cd, saf.retail_region, saf.retail_facility_code, saf.store_code 
                 FROM "global".store_attributes_filter saf 
                 WHERE (
                     -- WHS stores: Only apply retail_region filter
                     (saf.special_classification = ''WHS'' AND ' || retail_region_filter || ')
                     OR
                     -- Non-WHS stores: Apply all existing attribute filters
                     (
                         (saf.special_classification != ''WHS'' OR saf.special_classification IS NULL)
                         AND saf.store_code IN (
                             SELECT filtered.store_code 
                             FROM (' || "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $3) || ') filtered
                         )
                     )
                 )';
    
    -- Build table filters (limit, offset, etc.)
    query_table_filters := "global".form_table_query($4);
    
    -- Combine all parts into final query
    query_combine := 'SELECT * FROM (
                          SELECT
                              sm.*,
                              sdm.dc_map 
                          FROM (
                              SELECT main.store_name, main.store_description, attributes.* 
                              FROM (' || query_sm || ') main 
                              JOIN (' || query_sa || ') attributes ON main.store_code = attributes.store_code
                          ) sm
                          LEFT JOIN (
                              SELECT 
                                  store_code, 
                                  json_agg(jsonb_build_object(''dc_code'', dc.dc_code, ''name'', dc.name)) as dc_map 
                              FROM "global".store_dc_mapping sdm
                              JOIN "global".distribution_centres dc ON sdm.dc_code = dc.dc_code 
                              GROUP BY store_code
                          ) sdm ON sm.store_code = sdm.store_code 
                      ) X ' || query_table_filters;
    
    -- Log the generated query for debugging
    raise notice '%', query_combine;
    
    -- Determine if we need count or actual results
    if $5 is false then 
        final_query := query_combine;
    else
        final_query := 'select count(*) from (' || query_combine || ') temp';
    end if;
    
    -- Execute the query and return cursor
    open $1 for execute final_query;
    RETURN query_combine;
    
exception
    when others then
        raise notice 'Error in store_dc_mapping_list: %', SQLERRM;
        raise;
end
$function$;