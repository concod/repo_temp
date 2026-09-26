--liquibase formatted sql
--changeset priyaranjan.pradhan@impactanalytics.co:sync_oms_recommended_order runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_oms_recommended_order

DROP PROCEDURE IF EXISTS public.sync_oms_recommended_orders(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_recommended_orders(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_recommended_orders';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  -- Delete orders recommeded and retain only with pending approval
DELETE FROM inventory_smart.oms_orders_recommended oor
WHERE order_status_id = 0 OR 
   (order_status_id = 3 AND is_deleted = true)
   OR (order_status_id IN (1, -1)
       AND (
           CASE
               WHEN (
                   TO_TIMESTAMP(SUBSTRING(oor.order_batch_name FROM 'IA_Order_(\d{8}T\d{6})'),
                                'YYYYMMDD"T"HH24MISS')
                   AT TIME ZONE 'Asia/Kolkata'
               )::date IS NOT NULL
               THEN current_date-7 > (
                   TO_TIMESTAMP(SUBSTRING(oor.order_batch_name FROM 'IA_Order_(\d{8}T\d{6})'),
                                'YYYYMMDD"T"HH24MISS')
                   AT TIME ZONE 'Asia/Kolkata'
               )::date 
               ELSE false
           END
       )
   );
  if _is_historic then 
            delete from 
              inventory_smart.oms_orders_recommended 
            where 
              true;
        end if;
insert
	into
	inventory_smart.oms_orders_recommended
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
	order_placement_date_original,
	elt_projected_store_inv
	)
select
	--	nextval('inventory_smart.oms_orders_recommended_id_seq') as id,	
	MD5(CONCAT(paf.article,
	order_placement_date::text,
	order_placement_date::text,
	'True')) as order_group_id,
	null as order_batch_name,
	'Recommended' as order_gen_type,
	product_code,
	paf.l4_name AS style,
	paf.size,
	location as loc_code,
	orid.channel,
	paf.article,
	paf.vendor_id as vendor_code,
	paf.vendor_desc as vendor_name,
	CAST(order_placement_date AS DATE) as rop,
	null as grade,
	coalesce(CAST(roq_unconstrained AS int4),0) as order_quantity,
	coalesce((raw_roq * paf.cost),0) as order_cost,
	coalesce(paf.cost,0) as unit_cost,
	roq_constrained as roq_constrained,
	raw_roq as raw_roq,
	CAST(ia_shipment_order_quantity AS float8) as ia_shipment_order_quantity,
	roq_unconstrained as roq_unconstrained,
	CAST(order_placement_date AS DATE) as order_placement_date,
	CAST(order_placement_date AS DATE) as order_placement_recom_date,
	fiscal_year_week as fiscal_year_week,
	fdm.fiscal_year_month as fiscal_year_month,
	fdm.fiscal_year as fiscal_year,
	fdm.fiscal_year_quarter as fiscal_year_quarter,
	fdm.week_start_date as week_start_date,
	fdm.month as month,
	CAST(orid.receipt_date AS DATE) as expected_receipt_date,
	CAST(order_placement_date AS DATE) as rop_ideal,
	null as mode_shipment,
	lead_time as lead_time,
	order_to_po_processing_time as order_to_po_processing_time,
	lead_time as effective_lead_time,
	ok.min_order_quantity_shipment as min_order_quantity_shipment,
	ok.min_order_quantity_sku as min_order_quantity_sku,
	ok.min_order_quantity_style as min_order_quantity_style,
	ok.max_order_quantity_shipment as max_order_quantity_shipment,
	ok.max_order_quantity_sku as max_order_quantity_sku,
	ok.max_order_quantity_style as max_order_quantity_style,
	null as order_multiple,
	pending_user_reserve as inventory_hold,
	0 as order_status_id,
	112 as created_by,
	current_timestamp as created_at,
	null as updated_by,
	null as updated_at,
	date(order_placement_date::date +
	interval '7 day') as approve_by_date,
	false as is_deleted,
	false as is_resolved,
	CAST(recom_receipt_date AS DATE) as recom_receipt_date,
	CAST(orid.receipt_date AS DATE) as editable_expected_receipt_date,
	lost_sales_agg as lost_sales_agg,
	inventory_deficit_agg as inventory_deficit_agg,
	null as orders_upto_qty,
	elt_projected_bop as elt_projected_bop,
	elt_projected_safety_stock as elt_projected_safety_stock,
	order_type as order_type,
	null as target_qty,
	total_store_forecast as forecasted_sales,
	target_wos as target_wos,
	null as immd_roq,
	null as order_reason,
	cast(order_placement_date_original as date) as order_placement_date_original,
	elt_projected_store_inv
from
	public.oms_recommendation_input_data_uc orid
join
global.product_attributes_filter paf
		using(product_code)
join
inventory_smart.oms_kpi ok
		using(product_code,loc_code)
join
(
	select
		distinct fiscal_year_week,
		fiscal_week_begin_date as week_start_date,
		fiscal_year_quarter,
		fiscal_year,
		fiscal_year_month,
		fiscal_month_name as month
	from
		global.fiscal_date_mapping) fdm
		using(fiscal_year_week) 
join
(
select article, loc_code, po_to_order_processing as order_to_po_processing_time, lead_time
from inventory_smart.oms_constraints_lead_time
) oclt
on paf.article = oclt.article
and orid."location" = oclt.loc_code
ON conflict on constraint uk_oms_orders_recommended DO NOTHING;
 
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
