--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_deep_dive_filter_data_helper_vs_1 runOnChange:true stripComments:false splitStatements:false context:MTP-117760 labels:MTP-117760
--comment: Updated to use global.form_main_table_filters to fix product_codes column error
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
    where_paf_condition := global.form_main_table_filters('product_attributes_filter', product_filter);
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
	),
	size_order_data as (
		select product_code, size, MIN("order") as size_order
		from inventory_smart.article_status_tag
		group by product_code, size
	),
	joined_data as (
		select distinct 
			pi.product_code, 
			pi.size, 
			pi.article,
			si.store_name,
			si.dc_name,
			ast.size_order
		from filtered_product_data pi 
		inner join inventory_smart.oms_orders_recommended oor 
			on oor.product_code = pi.product_code and oor.size = pi.size 
		inner join filtered_store_data si 
			on oor.loc_code = si.store_code
		left join size_order_data ast 
			on ast.product_code = pi.product_code and ast.size = pi.size
        where oor.order_gen_type <> ''Manual''
	),
	ordered_sizes as (
		select size
		from joined_data
		group by size
		order by MIN(size_order) ASC NULLS LAST, size
	)
    select jsonb_build_object(
   		''product_code'', COALESCE(jsonb_agg(distinct jd.product_code ORDER BY jd.product_code), ''[]''::jsonb),
    	''size'', COALESCE((select jsonb_agg(size) from ordered_sizes), ''[]''::jsonb),
    	''store_name'', COALESCE(jsonb_agg(distinct jd.store_name ORDER BY jd.store_name), ''[]''::jsonb),
        ''dc_name'', COALESCE(jsonb_agg(distinct jd.dc_name ORDER BY jd.dc_name), ''[]''::jsonb),
    	''article'', COALESCE(jsonb_agg(distinct jd.article ORDER BY jd.article), ''[]''::jsonb)
    ) as distinct_values
	from joined_data jd
    ';
    RAISE NOTICE 'Transform Query: %', transform_query;

    -- Execute the dynamic SQL query and return the results
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;
