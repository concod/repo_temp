--liquibase formatted sql
--changeset aman.pareek:oms_deep_dive_base_data_storev4 runOnChange:true stripComments:false splitStatements:false context:None labels:oms_deep_dive_base_data_storev3
--comment: Created oms_deep_dive_base_data_store3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_deep_dive_filter_data_helper_store(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_deep_dive_filter_data_helper_store(product_filter jsonb, store_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    where_paf_condition TEXT := '';
    where_saf_condition text := '';
    transform_query text := '';
BEGIN
    -- Generate the WHERE conditions from the product_filter JSONB
    where_paf_condition := inventory_smart.form_main_table_filters('ph_master', product_filter);
    where_saf_condition := inventory_smart.form_main_table_filters('ph_master', store_filter);
   
    IF where_paf_condition IS NULL OR where_paf_condition = '' THEN
        where_paf_condition := 'WHERE 1=1';
    END if;
	IF where_saf_condition IS NULL OR where_saf_condition = '' THEN
        where_saf_condition := 'WHERE 1=1';
    END if;
   
    RAISE NOTICE 'Where PAF Condition: %', where_paf_condition;
    RAISE NOTICE 'Where SAF Condition: %', where_saf_condition;

    -- Construct the dynamic SQL query
    transform_query := '

	with filtered_store_data as (
		select  store_code
		from global.store_attributes_filter 
		' || where_saf_condition || '
		and active = True and special_classification = ''STORE''
	)
    select jsonb_build_object(
   		''article'', COALESCE(jsonb_agg(distinct oor.article), ''[]''::jsonb),
    	''size'', COALESCE(jsonb_agg(distinct oor.size), ''[]''::jsonb),
    	''store_code'', COALESCE(jsonb_agg(distinct oor.store_code), ''[]''::jsonb),
        ''sales_org_name'', COALESCE(jsonb_agg(distinct oor.sales_org_name), ''[]''::jsonb),
    	''region_name'', COALESCE(jsonb_agg(distinct oor.region_name), ''[]''::jsonb)
    ) as distinct_values
		from inventory_smart.oms_orders_recommended_store oor 
		INNER JOIN filtered_store_data sf ON oor.store_code = sf.store_code
		' || where_paf_condition || '
    ';
    RAISE NOTICE 'Transform Query: %', transform_query;

    -- Execute the dynamic SQL query and return the results
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;

