--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_oms_orders_recommended_store_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_po_master
--comment: initial changeset sync_oms_orders_recommended_store_v1

DROP PROCEDURE IF EXISTS public.sync_oms_orders_recommended_store();
CREATE OR REPLACE PROCEDURE public.sync_oms_orders_recommended_store()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_orders_recommended_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    DELETE FROM inventory_smart.oms_orders_recommended_store
    WHERE TRUE;

INSERT INTO inventory_smart.oms_orders_recommended_store (
        fiscal_year_week,
        fiscal_year_month,
        fiscal_year,
        fiscal_year_quarter,
        week_start_date,
        "month",
        order_gen_type,
        store_code,
        channel,
        "size",
        "style",
        article,
        order_type,
        flow_id,
        vendor_code,
        vendor_name,
        grade,
        order_quantity,
        order_cost,
        unit_cost,
        raw_roq,
        roq_unconstrained_eaches,
        roq_constrained,
        immd_roq,
        min_order_quantity_shipment,
        max_order_quantity_shipment,
        min_order_quantity_sku,
        max_order_quantity_sku,
        min_order_quantity_style,
        max_order_quantity_style,
        order_to_po_processing_time,
        lead_time,
        order_placement_date,
        order_placement_date_original,
        order_placement_recom_date,
        order_multiple,
        editable_expected_receipt_date,
        expected_receipt_date,
        order_status_id,
        rop,
        rop_ideal,
        effective_lead_time,
        inventory_hold,
        created_by,
        created_at,
        updated_by,
        updated_at,
        approve_by_date,
        is_deleted,
        is_resolved,
        recom_receipt_date,
        create_by_date,
        lost_sales_agg,
        inventory_deficit_agg,
        elt_projected_bop,
        elt_projected_safety_stock,
        lost_sales_agg_1,
        forecasted_sales,
        target_wos,
        lost_sales_agg_2,
        excess_inv,
        store_counts,
        store_tier,
        ia_shipment_order_quantity,
        mode_shipment,
        order_reason,
        order_batch_name,
        order_group_id,
        vendor_moq_adjusted_roq,
        shipment_optimized_roq,
        size_ratio_store,
        size_ratio_size,
        pack_config,
        pack_id,
        order_quantity_eaches,
        raw_roq_eaches,
        roq_constrained_eaches,
        elt_projected_store_inv,
        editable_effective_lead_time,
        edited_mode_shipment,
        on_order_quantity,
        elt_sales_forecast_twos,
        landing_cost,
        product_code,
        store_min,
        store_max,
        store_wos,
        "comment",
        roq_unconstrained,
        projected_delivery_date,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        l5_name,
        l6_name,
        style_name,
        store_name,
        region_name,
        sales_org_name
    )    
    SELECT distinct
    	fiscal_year_week,
		fdm.fiscal_year_month as fiscal_year_month,
		fdm.fiscal_year as fiscal_year,
		fdm.fiscal_year_quarter as fiscal_year_quarter,
		fdm.week_start_date as week_start_date,
		fdm.month as month,    
        order_gen_type,
        store_code,
        channel,
        "size",
        "style",
        article,
        order_type,--
        flow_id,
        vendor_code,
        vendor_name,
        grade,
        order_quantity,
        order_cost,
        unit_cost,
        raw_roq,
        roq_unconstrained AS roq_unconstrained_eaches,
        roq_constrained,--
        immd_roq,
        min_order_quantity_shipment,
        max_order_quantity_shipment,
        min_order_quantity_sku,
        max_order_quantity_sku,
        min_order_quantity_style,
        max_order_quantity_style,
        order_to_po_processing_time,--
        lead_time,
        order_placement_date,
        order_placement_date_original,
        order_placement_recom_date,
        order_multiple,
        editable_expected_receipt_date,
        expected_receipt_date,
        order_status_id,
        rop,
        rop_ideal,--
        effective_lead_time,
        inventory_hold,
        created_by,
        created_at,
        updated_by,
        updated_at,
        approve_by_date,
        is_deleted,
        is_resolved,--
        expected_receipt_date::date as recom_receipt_date,
        create_by_date,
        lost_sales_agg,
        inventory_deficit_agg,
        elt_projected_bop,
        elt_projected_safety_stock,
        lost_sales_agg_1,
        forecasted_sales,
        target_wos,
        lost_sales_agg_2,
        excess_inv,
        store_counts,
        store_tier,--
        ia_shipment_order_quantity,
        mode_shipment,
        order_reason,
        order_batch_name,
    	MD5(CONCAT(product_code,
		order_placement_date::text,
		order_placement_date::text,
		0)) as order_group_id,
--        order_group_id,
        vendor_moq_adjusted_roq,
        shipment_optimized_roq,
        size_ratio_store,
        size_ratio_size,
        pack_config,
        1 as pack_id,--
        order_quantity_eaches,
        raw_roq_eaches,
        roq_constrained AS roq_constrained_eaches,
        elt_projected_store_inv,
        0 AS editable_effective_lead_time,
        edited_mode_shipment,
        on_order_quantity,
        elt_sales_forecast_twos,
        landing_cost,
        product_code,
        0 AS store_min,
        999 AS store_max,
        3 AS store_wos,
        'vendor to store' AS "comment",
        roq_unconstrained,
        expected_receipt_date AS projected_delivery_date,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        l5_name,
        l6_name,
        style_name,
        store_name,
        region_name,
        sales_org_name
    FROM public.oms_orders_recommended_store
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
		using(fiscal_year_week);

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;