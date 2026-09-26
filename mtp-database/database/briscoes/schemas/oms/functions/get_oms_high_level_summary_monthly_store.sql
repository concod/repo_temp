--liquibase formatted sql
--changeset aman.pareek@impactanalytics.co:get_oms_high_level_summary_monthly_storev5 runOnChange:true stripComments:false splitStatements:false context:Release_1_6 labels:MTP-103380v2
--comment: MTP-136359 ensure all hierarchy+store_tier rows appear even with zero data for a month
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly_store(input refcursor, selected_hierarchy text, hierarchy_values text[], dc_or_channels text[], start_date text, end_date text, product_attribute_query jsonb, fiscal_year_month text[], store_attributes_query jsonb);
-- DROP FUNCTION inventory_smart.get_oms_high_level_summary_monthly_store(refcursor, text, _text, _text, text, text, jsonb, _text, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary_monthly_store(input refcursor, selected_hierarchy text, hierarchy_values text[], dc_or_channels text[], start_date text, end_date text, product_attribute_query jsonb, fiscal_year_month text[], store_attributes_query jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_high_level_summary_monthly_sql text := '';
  v_month text;
  v_year text;
  v_month_suffix text;
  v_pa_sql text;
  v_sa_sql text;
BEGIN
  -- Extract year and month from input start_date
  SELECT split_part(start_date, '-', 1), split_part(start_date, '-', 2)
  INTO v_year, v_month;
  v_month_suffix := '_' || v_month || '_' || v_year;

  -- Apply dynamic filters for product and store attributes
  v_pa_sql := inventory_smart.form_main_table_filters(
    'oms_orders_recommended_store',
    product_attribute_query
  );
  v_sa_sql := global.form_main_table_filters(
    'store_attributes_filter',
    store_attributes_query
  );

  -- Build dynamic SQL
  v_high_level_summary_monthly_sql := '
  WITH fym AS (
    SELECT fiscal_year_month FROM global.fiscal_date_mapping
    WHERE date BETWEEN ''' || start_date || ''' AND ''' || end_date || '''
  ),

  store_filter AS (
      SELECT store_code
      FROM global.store_attributes_filter
      ' || v_sa_sql || '
  ),
  paf AS (
    SELECT distinct product_code, sales_org_name,store_code,cost FROM inventory_smart.oms_orders_recommended_store oors
  ' || v_pa_sql || '
    AND EXISTS (SELECT 1 FROM store_filter sf WHERE oors.store_code = sf.store_code)
    AND oors.fiscal_year_month IN (SELECT fiscal_year_month FROM fym)
  ),
  filtered_data AS (
    SELECT * FROM inventory_smart.oms_orders_recommended_store oors
  ' || v_pa_sql || '
    AND EXISTS (SELECT 1 FROM store_filter sf WHERE oors.store_code = sf.store_code)
    AND oors.fiscal_year_month IN (SELECT fiscal_year_month FROM fym)
  ),

  agg_orders AS (
    SELECT 
      product_code,
      sales_org_name AS store_tier,
      ' || selected_hierarchy || ',
      SUM(CASE WHEN order_status_id = 1 THEN order_quantity_eaches ELSE 0 END) AS pending_orders' || v_month_suffix || ',
	  
      SUM(CASE WHEN order_status_id = 1 THEN cost * order_quantity_eaches ELSE 0 END) AS pending_orders_cost' || v_month_suffix || ',

      SUM(CASE WHEN order_status_id = 0 THEN raw_roq_eaches ELSE 0 END) AS base_roq' || v_month_suffix || ',
	  SUM(CASE WHEN order_status_id = 0 THEN cost *raw_roq_eaches ELSE 0 END) AS base_roq_cost' || v_month_suffix || ',

      SUM(CASE WHEN order_status_id = 0 THEN roq_unconstrained_eaches ELSE 0 END) AS vendor_moq_optimized_roq' || v_month_suffix || ',
      SUM(CASE WHEN order_status_id = 0 THEN cost * roq_unconstrained_eaches ELSE 0 END) AS vendor_moq_optimized_roq_cost' || v_month_suffix || ',
      SUM(CASE WHEN order_status_id = 0 THEN roq_constrained_eaches ELSE 0 END) AS constrained_recom' || v_month_suffix || ',
      SUM(CASE WHEN order_status_id = 0 THEN cost * roq_constrained_eaches ELSE 0 END) AS constrained_recom_cost' || v_month_suffix || ',

      SUM(CASE WHEN order_status_id = -1 THEN roq_constrained_eaches ELSE 0 END) AS order_under_review' || v_month_suffix || ',
      SUM(CASE WHEN order_status_id = -1 THEN cost * roq_constrained_eaches ELSE 0 END) AS order_under_review_cost' || v_month_suffix || ',

      SUM(CASE WHEN order_status_id = 3 THEN order_quantity_eaches ELSE 0 END) AS todays_app_orders' || v_month_suffix || ',
      SUM(CASE WHEN order_status_id = 3 THEN cost * order_quantity_eaches ELSE 0 END) AS todays_app_orders_cost' || v_month_suffix || '
    FROM filtered_data
    GROUP BY product_code, sales_org_name, ' || selected_hierarchy || '
  ),

po_filtered AS (
  SELECT 
    po.store_code,
    po.product_code,
    po.oo,
    po.it,
    fdm.fiscal_year_month
  FROM inventory_smart.oms_po_master_store po
  JOIN global.fiscal_date_mapping fdm 
    ON po.projected_delivery_date = fdm.date
  WHERE fdm.fiscal_year_month in (SELECT distinct fiscal_year_month FROM fym)
)
, opm AS (
  SELECT 
    fd.product_code,
    fd.sales_org_name AS store_tier,
    SUM(COALESCE(po.oo, 0)) AS on_order_quantity' || v_month_suffix || ',
    SUM(fd.cost * COALESCE(po.oo+po.it, 0)) AS on_order_quantity_cost' || v_month_suffix || '
  FROM paf fd
  JOIN po_filtered po
    ON fd.store_code = po.store_code AND fd.product_code = po.product_code
  GROUP BY fd.product_code, fd.sales_org_name
),

  sku_mapping AS (
    SELECT DISTINCT product_code, sales_org_name AS store_tier, ' || selected_hierarchy || '
    FROM filtered_data
  ),

  all_hierarchy_store AS (
    SELECT DISTINCT ' || selected_hierarchy || ', sales_org_name AS store_tier
    FROM inventory_smart.oms_orders_recommended_store oors
    ' || v_pa_sql || '
    AND EXISTS (SELECT 1 FROM store_filter sf WHERE oors.store_code = sf.store_code)
  ),

  aggregated AS (
    SELECT 
      sm.' || selected_hierarchy || ',
      sm.store_tier,
      COALESCE(SUM(opm.on_order_quantity' || v_month_suffix || '), 0) AS on_order_quantity_val,
      COALESCE(SUM(opm.on_order_quantity_cost' || v_month_suffix || '), 0) AS on_order_quantity_cost_val,
      COALESCE(SUM(ao.pending_orders' || v_month_suffix || '), 0) AS pending_orders_val,
      COALESCE(SUM(ao.pending_orders_cost' || v_month_suffix || '), 0) AS pending_orders_cost_val,
      COALESCE(SUM(ao.base_roq' || v_month_suffix || '), 0) AS base_roq_val,
      COALESCE(SUM(ao.base_roq_cost' || v_month_suffix || '), 0) AS base_roq_cost_val,
      COALESCE(SUM(ao.vendor_moq_optimized_roq' || v_month_suffix || '), 0) AS vendor_moq_optimized_roq_val,
      COALESCE(SUM(ao.vendor_moq_optimized_roq_cost' || v_month_suffix || '), 0) AS vendor_moq_optimized_roq_cost_val,
      COALESCE(SUM(ao.constrained_recom' || v_month_suffix || '), 0) AS constrained_recom_val,
      COALESCE(SUM(ao.constrained_recom_cost' || v_month_suffix || '), 0) AS constrained_recom_cost_val,
      COALESCE(SUM(ao.order_under_review' || v_month_suffix || '), 0) AS order_under_review_val,
      COALESCE(SUM(ao.order_under_review_cost' || v_month_suffix || '), 0) AS order_under_review_cost_val,
      COALESCE(SUM(ao.todays_app_orders' || v_month_suffix || '), 0) AS todays_app_orders_val,
      COALESCE(SUM(ao.todays_app_orders_cost' || v_month_suffix || '), 0) AS todays_app_orders_cost_val
    FROM sku_mapping sm
    LEFT JOIN agg_orders ao USING (product_code, store_tier)
    LEFT JOIN opm USING (product_code, store_tier)
    GROUP BY sm.' || selected_hierarchy || ', sm.store_tier
  )

  SELECT 
    ahs.' || selected_hierarchy || ',
    ahs.store_tier,
    COALESCE(agg.on_order_quantity_val, 0) AS on_order_quantity' || v_month_suffix || ',
    COALESCE(agg.on_order_quantity_cost_val, 0) AS on_order_quantity_cost' || v_month_suffix || ',
    COALESCE(agg.pending_orders_val, 0) AS pending_orders' || v_month_suffix || ',
    COALESCE(agg.pending_orders_cost_val, 0) AS pending_orders_cost' || v_month_suffix || ',
    COALESCE(agg.base_roq_val, 0) AS base_roq' || v_month_suffix || ',
    COALESCE(agg.base_roq_cost_val, 0) AS base_roq_cost' || v_month_suffix || ',
    COALESCE(agg.vendor_moq_optimized_roq_val, 0) AS vendor_moq_optimized_roq' || v_month_suffix || ',
    COALESCE(agg.vendor_moq_optimized_roq_cost_val, 0) AS vendor_moq_optimized_roq_cost' || v_month_suffix || ',
    COALESCE(agg.constrained_recom_val, 0) AS constrained_recom' || v_month_suffix || ',
    COALESCE(agg.constrained_recom_cost_val, 0) AS constrained_recom_cost' || v_month_suffix || ',
    COALESCE(agg.order_under_review_val, 0) AS order_under_review' || v_month_suffix || ',
    COALESCE(agg.order_under_review_cost_val, 0) AS order_under_review_cost' || v_month_suffix || ',
    COALESCE(agg.todays_app_orders_val, 0) AS todays_app_orders' || v_month_suffix || ',
    COALESCE(agg.todays_app_orders_cost_val, 0) AS todays_app_orders_cost' || v_month_suffix || '
  FROM all_hierarchy_store ahs
  LEFT JOIN aggregated agg ON ahs.' || selected_hierarchy || ' = agg.' || selected_hierarchy || ' AND ahs.store_tier = agg.store_tier;';

  RAISE NOTICE 'Executing SQL: %', v_high_level_summary_monthly_sql;
  OPEN input FOR EXECUTE v_high_level_summary_monthly_sql;
  RETURN input;
END;
$function$
;
