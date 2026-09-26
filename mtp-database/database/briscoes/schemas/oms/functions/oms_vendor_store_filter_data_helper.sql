--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oms_vendor_store_filter_data_helper_optimized runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:MTP-109299_1
--comment: MTP-101413 - Initial commit
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_vendor_store_filter_data_helper(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_vendor_store_filter_data_helper(product_filter jsonb, store_filter jsonb DEFAULT '{}'::jsonb)
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
    where_saf_condition := inventory_smart.form_main_table_filters('store_attributes_filter', store_filter);
   
    IF where_paf_condition IS NULL OR where_paf_condition = '' THEN
        where_paf_condition := 'WHERE 1=1';
    END if;
	IF where_saf_condition IS NULL OR where_saf_condition = '' THEN
        where_saf_condition := 'WHERE 1=1';
    END if;
   
    RAISE NOTICE 'Where PAF Condition: %', where_paf_condition;
    RAISE NOTICE 'Where SAF Condition: %', where_saf_condition;

    -- Fixed query: correct CTE usage, proper joins, and filter application
    transform_query := '
  WITH 
	filtered_store_data AS (
		SELECT DISTINCT store_code, store_name, dc_name, region_name, sales_org_name
		FROM global.store_attributes_filter 
		' || where_saf_condition || '
		AND active = True
	),
  filtered_product_data AS (
    SELECT oors.*
    FROM inventory_smart.oms_orders_recommended_store oors
    INNER JOIN filtered_store_data saf ON oors.store_code = saf.store_code
    ' || where_paf_condition || ' AND oors.order_gen_type <> ''Manual''
  ),
  filtered_oms_data AS (
    SELECT DISTINCT 
      oors.size,
      oors.store_code,
      saf.store_name,
      saf.region_name,
      oors.sales_org_name
    FROM filtered_product_data oors
    INNER JOIN filtered_store_data saf ON oors.store_code = saf.store_code
  )
  SELECT jsonb_build_object(
      ''size'', COALESCE(jsonb_agg(DISTINCT fmd.size), ''[]''::jsonb),
      ''store_code'', COALESCE(jsonb_agg(DISTINCT fmd.store_code), ''[]''::jsonb),
      ''site_name'', COALESCE(jsonb_agg(DISTINCT fmd.store_name), ''[]''::jsonb),
      ''region_name'', COALESCE(jsonb_agg(DISTINCT fmd.region_name), ''[]''::jsonb),
      ''sales_org_name'', COALESCE(jsonb_agg(DISTINCT fmd.sales_org_name), ''[]''::jsonb)
  ) as distinct_values
  FROM filtered_oms_data fmd
  ';
    RAISE NOTICE 'Transform Query: %', transform_query;

    -- Execute the dynamic SQL query and return the results
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;