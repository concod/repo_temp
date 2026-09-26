--liquibase formatted sql
--changeset priyansh.gautam:oms_deep_dive_filter_data_helper3 runOnChange:true stripComments:false splitStatements:false context:MTP-58684 labels:oms_deep_dive_filter_data_helper
--comment: Added oms_deep_dive_filter_data_helper 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_deep_dive_filter_data_helper(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_deep_dive_filter_data_helper(product_filter jsonb, store_filter jsonb DEFAULT '{}'::jsonb)
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
    with filtered_product_data as (
        select product_code, size, article
        from global.product_attributes_filter
        ' || where_paf_condition || '
    ),
	filtered_store_data as (
		select dc_name, store_code, store_name
		from global.store_attributes_filter 
		' || where_saf_condition || '
		and active = True and special_classification = ''WHS''
	)
    select jsonb_build_object(
   		''product_code'', COALESCE(jsonb_agg(distinct pi.product_code), ''[]''::jsonb),
    	''size'', COALESCE(jsonb_agg(distinct pi.size), ''[]''::jsonb),
    	''store_name'', COALESCE(jsonb_agg(distinct si.store_name), ''[]''::jsonb),
        ''dc_name'', COALESCE(jsonb_agg(distinct si.dc_name), ''[]''::jsonb),
    	''article'', COALESCE(jsonb_agg(distinct pi.article), ''[]''::jsonb)
    ) as distinct_values
		from  filtered_product_data pi inner join inventory_smart.oms_orders_recommended oor 
		on oor.product_code = pi.product_code and oor.size = pi.size inner join 
		filtered_store_data si on oor.loc_code = si.store_code
        where oor.order_gen_type <> ''Manual''
    ';
    RAISE NOTICE 'Transform Query: %', transform_query;

    -- Execute the dynamic SQL query and return the results
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;
