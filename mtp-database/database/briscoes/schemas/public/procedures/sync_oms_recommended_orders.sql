--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:sync_oms_recommended_orders runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_recommended_orders
--comment: initial changeset sync_oms_recommended_orders 

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
-- Delete orders recommeded and retain only with pending approval orders greater than 7 days of approvals
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
            delete
from
	inventory_smart.oms_orders_recommended
where
	true;
end if;

insert
	into
	inventory_smart.oms_orders_recommended
  (
--  id,
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
select
--	nextval('inventory_smart.oms_orders_recommended_new_id_seq') as id,	
	  MD5(
        CONCAT(
            COALESCE(paf.article, ''),
            COALESCE(orid.order_placement_date::text, ''),
            COALESCE(orid.order_placement_date::text, ''),
            'True'
        )
        ) as order_group_id,
	null as order_batch_name,
	'Recommended' as order_gen_type,
	orid.product_code,
	paf.style,
	paf.size,
	orid.loc_code as loc_code,
	orid.channel,
	paf.article,
	paf.primary_vendor_cd as vendor_code,
	paf.primary_vendor_dsc as vendor_name,
	orid.order_placement_date::date as rop,
	null as grade,
	coalesce(orid.roq_constrained::int,0) as order_quantity,
	coalesce(orid.roq_constrained::int * paf.cost) as order_cost,
	paf.cost as unit_cost,
	coalesce(orid.roq_constrained::int,0) as roq_constrained,
	coalesce(orid.raw_roq::int,0) as raw_roq,
	coalesce(orid.ia_shipment_order_quantity::int,0) as ia_shipment_order_quantity,
	coalesce(orid.roq_unconstrained::int,0) as roq_unconstrained,
	orid.order_placement_date::date as order_placement_date,
	orid.order_placement_date::date as order_placement_recom_date,
	fiscal_year_week as fiscal_year_week,
	fdm.fiscal_year_month as fiscal_year_month,
	fdm.fiscal_year as fiscal_year,
	fdm.fiscal_year_quarter as fiscal_year_quarter,
	fdm.week_start_date as week_start_date,
	fdm.month as month,
	orid.receipt_date::date as expected_receipt_date,
	orid.order_placement_date::date as rop_ideal,
	null as mode_shipment,
	oclt.lead_time::int as lead_time,
	oclt.po_to_order_processing::int as order_to_po_processing_time,
	oclt.lead_time::int as effective_lead_time,
	orid.min_order_quantity_shipment::int as min_order_quantity_shipment,
	ok.min_order_quantity_sku::int as min_order_quantity_sku,
	orid.min_order_quantity_style::int as min_order_quantity_style,
	orid.max_order_quantity_shipment::int as max_order_quantity_shipment,
	ok.max_order_quantity_sku::int as max_order_quantity_sku,
	orid.max_order_quantity_style::int as max_order_quantity_style,
	null as order_multiple,
	pending_user_reserve::int as inventory_hold,
	0 as order_status_id,
	112 as created_by,
	current_timestamp as created_at,
	null as updated_by,
	null as updated_at,
	date(orid.order_placement_date::date +
	interval '7 day') as approve_by_date,
	false as is_deleted,
	false as is_resolved,
	orid.recom_receipt_date::date as recom_receipt_date,
	orid.receipt_date::date as editable_expected_receipt_date,
	orid.lost_sales_agg::int as lost_sales_agg,
	orid.inventory_deficit_agg::int as inventory_deficit_agg,
	null as orders_upto_qty,
	orid.elt_projected_bop::int as elt_projected_bop,
	orid.elt_projected_safety_stock::int as elt_projected_safety_stock,
	orid.order_type as order_type,
	null as target_qty,
	orid.total_store_forecast as forecasted_sales,
	orid.target_wos as target_wos,
	null as immd_roq,
	null as order_reason,
	orid.elt_projected_store_inv,
	orid.order_placement_date_original::date as order_placement_date_original
from
	public.oms_recommendation_input_data orid
join
(
	select 
		distinct product_code,
		article,
		style_name as style,
		size,
		vendor_id as primary_vendor_cd,
		vendor_name as primary_vendor_dsc,
		cost
	 from global.product_attributes_filter paf
     where 
     	trim(upper(paf.replen_flag)) in ('DC') 
  		and trim(upper(paf.ordering_flag)) not in ('OFF')
)as paf		
	using(product_code)
join
(
	select
		distinct fiscal_year_week,
		fdm.fiscal_week_begin_date as week_start_date,
		fiscal_year_quarter,
		fiscal_year,
		fiscal_year_month,
		fiscal_month_name as month
	from
		global.fiscal_date_mapping fdm
	join
		(
			select distinct
				fiscal_week_begin_date
			from global.fiscal_date_mapping
		) as b1
	on fdm.date = b1.fiscal_week_begin_date
)as fdm
	using(fiscal_year_week) 
left join inventory_smart.oms_constraints_lead_time oclt
	using(article,loc_code,channel)
left join inventory_smart.oms_kpi ok
on orid.product_code = ok.product_code
				and orid.loc_code = ok.loc_code
				and orid.channel = ok.channel	
				
where order_type is not null
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

