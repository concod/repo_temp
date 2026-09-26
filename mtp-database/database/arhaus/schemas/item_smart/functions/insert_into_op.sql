--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_into_op runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:item_smart_initial_commit
--comment: column changeset for insert_into_op
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_into_op(dept_param text[], start_week integer, end_week integer, channels text[]);
CREATE OR REPLACE FUNCTION item_smart.insert_into_op(dept_param text[], start_week integer, end_week integer, channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    rows_inserted INT := 0;
BEGIN
    -- Insert into op_master table
    INSERT INTO item_smart.op_master (
		dept,channel,current_week,hierarchy_code,product_type,created_by,
		created_at,updated_by,updated_at,store_count,written_sales_dollars,
		compared_week,written_sales_units,written_sales_cost,
		written_air,written_aur,written_dr_perc,written_backorder_sales_units,
		written_backorder_sales,cancelled_dollars,cancelled_qty,
		cancelled_cost,non_delivered_dollars,non_delivered_qty,non_delivered_cost,
		wei_age_non_delivered_sales_dollars,wei_age_non_delivered_units,
		wei_age_non_delivered_costs,delivered_returns_dollars,delivered_returns_qty,
		delivered_returns_cost,delivered_net_sales_dollars,delivered_air,
		delivered_aur,delivered_drperc,delivered_net_sales_units,
		delivered_net_sales_cost,delivered_auc,bop_units,bop_cost,bop_auc,
		atp_units,atp_cost,aoh_units,aoh_cost,total_receipt_cost,total_receipt_units,
		delivered_gmperc,delivered_gm,on_order_placed_total,on_order_placed_stock,
		on_order_placed_total_unit,on_order_placed_stock_unit,written_auc,
		written_cancel_retail_rate_perc,written_cancel_units_rate_perc,
		written_cancel_cost_rate_perc,delivered_retail_return_rate_perc,
		delivered_unit_return_rate_perc,delivered_cost_return_rate_perc,
		written_sales_build_ratio,written_sales_units_build_ratio,
		delivered_net_sales_build_ratio,delivered_net_sales_units_build_ratio,
		on_order_placed_total_auc,on_order_placed_stock_auc,on_order_placed_spo_auc,
		eop_cost,total_receipts_auc,stock_receipts_auc,spo_receipts_auc,eop_auc,
		inv_adj_cost,inv_adj_units,written_imu,delivered_gmroi,inv_adj_cost_perc,
		inv_adj_units_perc,inv_adj_auc,aoh_fwos_units,aoh_fwos_cost,atp_fwos_units,
		atp_fwos_cost,retail_conversion_adjustment,on_order_unplaced_total,
		on_order_unplaced_stock,on_order_unplaced_total_unit,
		on_order_unplaced_stock_unit,on_order_unplaced_total_auc,
		on_order_unplaced_stock_auc,l3_name_channel,written_gm_perc,
		written_gm_dollar,eop_units,written_backorder_aur,cancelled_aur,
		markdown_conv_cost_dollar,markdown_conv_cost_unit,aoh_cost_eop,
		aoh_units_eop,recomm_receipt_units,recomm_receipt_cost,recomm_receipt_auc,
		scenario,actualised,revenue,discount

    )
    SELECT 
		wp.dept, wp.channel, wp.current_week, wp.hierarchy_code, wp.product_type, wp.created_by,
		NOW() AS created_at, wp.updated_by, wp.updated_at, wp.store_count, wp.written_sales_dollars,
		wp.compared_week, wp.written_sales_units, wp.written_sales_cost,
		wp.written_air, wp.written_aur, wp.written_dr_perc, wp.written_backorder_sales_units,
		wp.written_backorder_sales, wp.cancelled_dollars, wp.cancelled_qty,
		wp.cancelled_cost, wp.non_delivered_dollars, wp.non_delivered_qty, wp.non_delivered_cost,
		wp.wei_age_non_delivered_sales_dollars, wp.wei_age_non_delivered_units,
		wp.wei_age_non_delivered_costs, wp.delivered_returns_dollars, wp.delivered_returns_qty,
		wp.delivered_returns_cost, wp.delivered_net_sales_dollars, wp.delivered_air,
		wp.delivered_aur, wp.delivered_drperc, wp.delivered_net_sales_units,
		wp.delivered_net_sales_cost, wp.delivered_auc, wp.bop_units, wp.bop_cost, wp.bop_auc,
		wp.atp_units, wp.atp_cost, wp.aoh_units, wp.aoh_cost, wp.total_receipt_cost, wp.total_receipt_units,
		wp.delivered_gmperc, wp.delivered_gm, wp.on_order_placed_total, wp.on_order_placed_stock,
		wp.on_order_placed_total_unit, wp.on_order_placed_stock_unit, wp.written_auc,
		wp.written_cancel_retail_rate_perc, wp.written_cancel_units_rate_perc,
		wp.written_cancel_cost_rate_perc, wp.delivered_retail_return_rate_perc,
		wp.delivered_unit_return_rate_perc, wp.delivered_cost_return_rate_perc,
		wp.written_sales_build_ratio, wp.written_sales_units_build_ratio,
		wp.delivered_net_sales_build_ratio, wp.delivered_net_sales_units_build_ratio,
		wp.on_order_placed_total_auc, wp.on_order_placed_stock_auc, wp.on_order_placed_spo_auc,
		wp.eop_cost, wp.total_receipts_auc, wp.stock_receipts_auc, wp.spo_receipts_auc, wp.eop_auc,
		wp.inv_adj_cost, wp.inv_adj_units, wp.written_imu, wp.delivered_gmroi, wp.inv_adj_cost_perc,
		wp.inv_adj_units_perc, wp.inv_adj_auc, wp.aoh_fwos_units, wp.aoh_fwos_cost, wp.atp_fwos_units,
		wp.atp_fwos_cost, wp.retail_conversion_adjustment, wp.on_order_unplaced_total,
		wp.on_order_unplaced_stock, wp.on_order_unplaced_total_unit,
		wp.on_order_unplaced_stock_unit, wp.on_order_unplaced_total_auc,
		wp.on_order_unplaced_stock_auc, wp.l3_name_channel, wp.written_gm_perc,
		wp.written_gm_dollar, wp.eop_units, wp.written_backorder_aur, wp.cancelled_aur,
		wp.markdown_conv_cost_dollar, wp.markdown_conv_cost_unit, wp.aoh_cost_eop,
		wp.aoh_units_eop, wp.recomm_receipt_units, wp.recomm_receipt_cost, wp.recomm_receipt_auc,
		wp.scenario, wp.actualised, wp.revenue, wp.discount
    FROM item_smart.wp_master wp
    WHERE 
        wp.dept = ANY(dept_param) -- Compare dept case-insensitively
        AND wp.current_week BETWEEN start_week AND end_week
        AND wp.channel = ANY(channels)
	ON CONFLICT (dept, current_week, channel, hierarchy_code) DO UPDATE
	SET
	    product_type = EXCLUDED.product_type,
	    created_by = EXCLUDED.created_by,
	    created_at = EXCLUDED.created_at,
	    updated_by = EXCLUDED.updated_by,
	    updated_at = EXCLUDED.updated_at,
	    store_count = EXCLUDED.store_count,
	    written_sales_dollars = EXCLUDED.written_sales_dollars,
	    compared_week = EXCLUDED.compared_week,
	    written_sales_units = EXCLUDED.written_sales_units,
	    written_sales_cost = EXCLUDED.written_sales_cost,
	    written_air = EXCLUDED.written_air,
	    written_aur = EXCLUDED.written_aur,
	    written_dr_perc = EXCLUDED.written_dr_perc,
	    written_backorder_sales_units = EXCLUDED.written_backorder_sales_units,
	    written_backorder_sales = EXCLUDED.written_backorder_sales,
	    cancelled_dollars = EXCLUDED.cancelled_dollars,
	    cancelled_qty = EXCLUDED.cancelled_qty,
	    cancelled_cost = EXCLUDED.cancelled_cost,
	    non_delivered_dollars = EXCLUDED.non_delivered_dollars,
	    non_delivered_qty = EXCLUDED.non_delivered_qty,
	    non_delivered_cost = EXCLUDED.non_delivered_cost,
	    wei_age_non_delivered_sales_dollars = EXCLUDED.wei_age_non_delivered_sales_dollars,
	    wei_age_non_delivered_units = EXCLUDED.wei_age_non_delivered_units,
	    wei_age_non_delivered_costs = EXCLUDED.wei_age_non_delivered_costs,
	    delivered_returns_dollars = EXCLUDED.delivered_returns_dollars,
	    delivered_returns_qty = EXCLUDED.delivered_returns_qty,
	    delivered_returns_cost = EXCLUDED.delivered_returns_cost,
	    delivered_net_sales_dollars = EXCLUDED.delivered_net_sales_dollars,
	    delivered_air = EXCLUDED.delivered_air,
	    delivered_aur = EXCLUDED.delivered_aur,
	    delivered_drperc = EXCLUDED.delivered_drperc,
	    delivered_net_sales_units = EXCLUDED.delivered_net_sales_units,
	    delivered_net_sales_cost = EXCLUDED.delivered_net_sales_cost,
	    delivered_auc = EXCLUDED.delivered_auc,
	    bop_units = EXCLUDED.bop_units,
	    bop_cost = EXCLUDED.bop_cost,
	    bop_auc = EXCLUDED.bop_auc,
	    atp_units = EXCLUDED.atp_units,
	    atp_cost = EXCLUDED.atp_cost,
	    aoh_units = EXCLUDED.aoh_units,
	    aoh_cost = EXCLUDED.aoh_cost,
	    total_receipt_cost = EXCLUDED.total_receipt_cost,
	    total_receipt_units = EXCLUDED.total_receipt_units,
	    delivered_gmperc = EXCLUDED.delivered_gmperc,
	    delivered_gm = EXCLUDED.delivered_gm,
	    on_order_placed_total = EXCLUDED.on_order_placed_total,
	    on_order_placed_stock = EXCLUDED.on_order_placed_stock,
	    on_order_placed_total_unit = EXCLUDED.on_order_placed_total_unit,
	    on_order_placed_stock_unit = EXCLUDED.on_order_placed_stock_unit,
	    written_auc = EXCLUDED.written_auc,
	    written_cancel_retail_rate_perc = EXCLUDED.written_cancel_retail_rate_perc,
	    written_cancel_units_rate_perc = EXCLUDED.written_cancel_units_rate_perc,
	    written_cancel_cost_rate_perc = EXCLUDED.written_cancel_cost_rate_perc,
	    delivered_retail_return_rate_perc = EXCLUDED.delivered_retail_return_rate_perc,
	    delivered_unit_return_rate_perc = EXCLUDED.delivered_unit_return_rate_perc,
	    delivered_cost_return_rate_perc = EXCLUDED.delivered_cost_return_rate_perc,
	    written_sales_build_ratio = EXCLUDED.written_sales_build_ratio,
	    written_sales_units_build_ratio = EXCLUDED.written_sales_units_build_ratio,
	    delivered_net_sales_build_ratio = EXCLUDED.delivered_net_sales_build_ratio,
	    delivered_net_sales_units_build_ratio = EXCLUDED.delivered_net_sales_units_build_ratio,
	    on_order_placed_total_auc = EXCLUDED.on_order_placed_total_auc,
	    on_order_placed_stock_auc = EXCLUDED.on_order_placed_stock_auc,
	    on_order_placed_spo_auc = EXCLUDED.on_order_placed_spo_auc,
	    eop_cost = EXCLUDED.eop_cost,
	    total_receipts_auc = EXCLUDED.total_receipts_auc,
	    stock_receipts_auc = EXCLUDED.stock_receipts_auc,
	    spo_receipts_auc = EXCLUDED.spo_receipts_auc,
	    eop_auc = EXCLUDED.eop_auc,
	    inv_adj_cost = EXCLUDED.inv_adj_cost,
	    inv_adj_units = EXCLUDED.inv_adj_units,
	    written_imu = EXCLUDED.written_imu,
	    delivered_gmroi = EXCLUDED.delivered_gmroi,
	    inv_adj_cost_perc = EXCLUDED.inv_adj_cost_perc,
	    inv_adj_units_perc = EXCLUDED.inv_adj_units_perc,
	    inv_adj_auc = EXCLUDED.inv_adj_auc,
	    aoh_fwos_units = EXCLUDED.aoh_fwos_units,
	    aoh_fwos_cost = EXCLUDED.aoh_fwos_cost,
	    atp_fwos_units = EXCLUDED.atp_fwos_units,
	    atp_fwos_cost = EXCLUDED.atp_fwos_cost,
	    retail_conversion_adjustment = EXCLUDED.retail_conversion_adjustment,
	    on_order_unplaced_total = EXCLUDED.on_order_unplaced_total,
	    on_order_unplaced_stock = EXCLUDED.on_order_unplaced_stock,
	    on_order_unplaced_total_unit = EXCLUDED.on_order_unplaced_total_unit,
	    on_order_unplaced_stock_unit = EXCLUDED.on_order_unplaced_stock_unit,
	    on_order_unplaced_total_auc = EXCLUDED.on_order_unplaced_total_auc,
	    on_order_unplaced_stock_auc = EXCLUDED.on_order_unplaced_stock_auc,
	    l3_name_channel = EXCLUDED.l3_name_channel,
	    written_gm_perc = EXCLUDED.written_gm_perc,
	    written_gm_dollar = EXCLUDED.written_gm_dollar,
	    eop_units = EXCLUDED.eop_units,
	    written_backorder_aur = EXCLUDED.written_backorder_aur,
	    cancelled_aur = EXCLUDED.cancelled_aur,
	    markdown_conv_cost_dollar = EXCLUDED.markdown_conv_cost_dollar,
	    markdown_conv_cost_unit = EXCLUDED.markdown_conv_cost_unit,
	    aoh_cost_eop = EXCLUDED.aoh_cost_eop,
	    aoh_units_eop = EXCLUDED.aoh_units_eop,
	    recomm_receipt_units = EXCLUDED.recomm_receipt_units,
	    recomm_receipt_cost = EXCLUDED.recomm_receipt_cost,
	    recomm_receipt_auc = EXCLUDED.recomm_receipt_auc,
	    scenario = EXCLUDED.scenario,
	    actualised = EXCLUDED.actualised,
	    revenue = EXCLUDED.revenue,
	    discount = EXCLUDED.discount;


    -- Get the count of inserted records
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    
    -- Log insertion status and count
    RAISE INFO 'Inserted % rows into op_master for depts: %', rows_inserted, array_to_string(dept_param, ', ');

    -- Return the count of rows inserted
    RETURN rows_inserted;

EXCEPTION
    WHEN others THEN
        -- Log exception details
        RAISE INFO 'Exception occurred: %', SQLERRM;
        -- Handle exceptions
        RETURN -1; 
END;
$function$
;
