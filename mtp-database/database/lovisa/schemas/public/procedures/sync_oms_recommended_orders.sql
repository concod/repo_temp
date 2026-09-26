-- liquibase formatted sql
-- changeset vikramsundar.k@impactanalytics.co:sync_oms_recommended_orders_v_4 runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oor3
-- comment: sync_oms_recommended_orders_order_placement_v_4

DROP  PROCEDURE if exists public.sync_oms_recommended_orders();
CREATE OR REPLACE PROCEDURE public.sync_oms_recommended_orders(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_recommended_orders';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin -- Delete orders recommeded and retain only with pending approval
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    if _is_historic then
        delete from
        inventory_smart.oms_orders_recommended
        where
        true;
    else
delete from
  inventory_smart.oms_orders_recommended
where
  (order_status_id = 0)
  or (
    order_status_id = 3
    and is_deleted = true
  )
or ( order_status_id IN (1,2,-1)
     AND CASE WHEN 
     (
     TO_TIMESTAMP(SUBSTRING(order_batch_name FROM 'IA_Order_(\d{8}T\d{6})'),'YYYYMMDD"T"HH24MISS') AT TIME ZONE 'Australia/Melbourne'
     )::date IS NOT NULL
     THEN current_date-7 > (TO_TIMESTAMP(SUBSTRING(order_batch_name FROM 'IA_Order_(\d{8}T\d{6})'),'YYYYMMDD"T"HH24MISS')AT TIME ZONE 'Australia/Melbourne')::date 
     ELSE false
     END
     );
   end if; 
  INSERT INTO inventory_smart.oms_orders_recommended
  (
   
    order_group_id,
    order_batch_name,
    order_gen_type,
    product_code,
    style,
    size,
    loc_code,
    channel,
    article,
    vendor_code,
    vendor_name,
    rop,
    grade,
    order_quantity,
    order_cost,
    unit_cost,
    roq_constrained,
    raw_roq,
    ia_shipment_order_quantity,
    roq_unconstrained,
    order_placement_date,
    order_placement_recom_date,
    fiscal_year_week,
    fiscal_year_month,
    fiscal_year,
    fiscal_year_quarter,
    week_start_date,
    month,
    expected_receipt_date,
    rop_ideal,
    mode_shipment,
    lead_time,
    order_to_po_processing_time,
    effective_lead_time,
    min_order_quantity_shipment,
    min_order_quantity_sku,
    min_order_quantity_style,
    max_order_quantity_shipment,
    max_order_quantity_sku,
    max_order_quantity_style,
    order_multiple,
    inventory_hold,
    order_status_id,
    created_by,
    created_at,
    updated_by,
    updated_at,
    approve_by_date,
    is_deleted,
    is_resolved,
    recom_receipt_date,
    editable_expected_receipt_date,
    lost_sales_agg,
    inventory_deficit_agg,
    orders_upto_qty,
    elt_projected_bop,
    elt_projected_safety_stock,
    order_type,
    target_qty,
    forecasted_sales,
    target_wos,
    immd_roq,
    order_reason,
    elt_projected_store_inv,
    order_placement_date_original
  )
SELECT
    -- Use MD5 to generate a unique order_group_id
         MD5(
        CONCAT(
            COALESCE(paf.product_code, ''),
            COALESCE(order_placement_date::text, ''),
            COALESCE(order_placement_date::text, ''),
            'True'
        )
        ) as order_group_id,
    NULL AS order_batch_name,
    'Recommended' AS order_gen_type,
    orid.product_code,
    paf.style_name as style,
    paf.size,
    orid.loc_code,
    orid.channel,
    paf.article,
    paf.vendor_id AS vendor_code,
    paf.vendor AS vendor_name,
    CAST(order_placement_date AS DATE) AS rop,
    NULL AS grade,
    roq_constrained::int4 AS order_quantity,
    COALESCE(roq_constrained::int4 * paf.cost, 0) AS order_cost,
    paf.cost AS unit_cost,
    roq_constrained::int4 AS roq_constrained,
    raw_roq::int4 AS raw_roq,
    ia_shipment_order_quantity::int4 AS ia_shipment_order_quantity,
    roq_unconstrained::int4 AS roq_unconstrained,
    CAST(order_placement_date AS DATE) AS order_placement_date,
    CAST(order_placement_date AS DATE) AS order_placement_recom_date,
    orid.fiscal_year_week AS fiscal_year_week,
    fdm.fiscal_year_month AS fiscal_year_month,
    fdm.fiscal_year AS fiscal_year,
    fdm.fiscal_year_quarter AS fiscal_year_quarter,
    fdm.week_start_date::date AS week_start_date,
    fdm.month AS month,
    cast(orid.receipt_date as date) AS expected_receipt_date,
    CAST(order_placement_date AS DATE) AS rop_ideal,
    coalesce(sm.mode_shipment, 'Air') AS mode_shipment,
    eff_lead_time AS lead_time,
    sm.po_to_order_processing AS po_to_order_processing_time,
    eff_lead_time AS effective_lead_time,
    coalesce(ok.min_order_quantity_shipment,0) AS min_order_quantity_shipment,
    COALESCE(ok.min_order_quantity_sku, 0) AS min_order_quantity_sku,
    COALESCE(ok.min_order_quantity_style,0) AS min_order_quantity_style,
    COALESCE(ok.max_order_quantity_shipment,0) AS max_order_quantity_shipment,
    COALESCE(ok.max_order_quantity_sku,0) AS max_order_quantity_sku,
    COALESCE(ok.max_order_quantity_style,0) AS max_order_quantity_style,
    COALESCE(osc.order_multiple,1) AS order_multiple,
    pending_user_reserve AS inventory_hold,
    0 AS order_status_id,
    NULL AS created_by,
    CURRENT_TIMESTAMP AS created_at,
    NULL AS updated_by,
    NULL AS updated_at,
    DATE(order_placement_date::date + INTERVAL '7 day') AS approve_by_date,
    FALSE AS is_deleted,
    FALSE AS is_resolved,
    CAST(recom_receipt_date AS DATE) AS recom_receipt_date,
    CAST(orid.receipt_date AS DATE) AS editable_expected_receipt_date,
    lost_sales_agg AS lost_sales_agg,
    inventory_deficit_agg AS inventory_deficit_agg,
    NULL AS orders_upto_qty,
    elt_projected_bop AS elt_projected_bop,
    elt_projected_safety_stock AS elt_projected_safety_stock,
    order_type AS order_type,
    NULL AS target_qty,
    total_store_forecast AS forecasted_sales,
    target_wos AS target_wos,
    NULL AS immd_roq,
    NULL AS order_reason,
    elt_projected_store_inv,
    order_placement_date_original::date as order_placement_date_original
  FROM public.oms_recommendation_input_data orid
  LEFT JOIN inventory_smart.oms_kpi ok
    ON ok.product_code = orid.product_code
   AND ok.loc_code = orid.loc_code
  JOIN global.store_attributes_filter saf
    ON orid.loc_code = saf.store_code
  JOIN (
  select distinct l4_name as product_code, l4_name as article,style_name, vendor_id, vendor,size, avg(cost) as cost
  from global.product_attributes_filter
  where not is_deleted
  group by 1,2,3,4,5,6
  ) paf
    ON paf.product_code = orid.product_code
  left join (select distinct article, loc_code, mode_shipment, po_to_order_processing
               from inventory_smart.oms_constraints_lead_time
               where default_mode = 1) sm
  on paf.article = sm.article
  and orid.loc_code = sm.loc_code
  LEFT JOIN (
  SELECT DISTINCT 
  product_code,
  loc_code,
  order_multiple 
  FROM inventory_smart.oms_constraints_shipment
  ) osc ON orid.product_code = osc.product_code and orid.loc_code = osc.loc_code
  JOIN (
    SELECT DISTINCT
      fiscal_year_week,
      fiscal_week_begin_date AS week_start_date,
      fiscal_year_quarter,
      fiscal_year,
      fiscal_year_month,
      fiscal_month_name AS month
    FROM global.fiscal_date_mapping
  ) fdm ON fdm.fiscal_year_week = orid.fiscal_year_week
  ON CONFLICT ON CONSTRAINT uk_oms_orders_recommended DO NOTHING;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;