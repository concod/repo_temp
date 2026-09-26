--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_into_lf_sub_channel runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:insert_into_lf_sub_channel
--comment: column changeset for insert_into_lf_sub_channel
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_into_lf(dept_param text[], start_week integer, end_week integer, channels text[], sub_channels text[],timezone_param text);
CREATE OR REPLACE FUNCTION item_smart.insert_into_lf(dept_param text[], start_week integer, end_week integer, channels text[], sub_channels text[] DEFAULT NULL::text[], timezone_param text DEFAULT 'US/Eastern'::text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    rows_inserted INT := 0;
    dept_name text;
    final_timezone TEXT;
    original_timezone TEXT;
    error_message TEXT;
    error_context TEXT;
    main_query TEXT;
    sub_channel_condition TEXT := '';
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    IF dept_param IS NULL OR array_length(dept_param, 1) = 0 THEN
        RAISE EXCEPTION 'Department parameter cannot be null or empty';
    END IF;

    IF start_week IS NULL OR end_week IS NULL THEN
        RAISE EXCEPTION 'Start week and end week parameters cannot be null';
    END IF;

    IF start_week > end_week THEN
        RAISE EXCEPTION 'Start week cannot be greater than end week';
    END IF;

    IF channels IS NULL OR array_length(channels, 1) = 0 THEN
        RAISE EXCEPTION 'Channels parameter cannot be null or empty';
    END IF;

    original_timezone := current_setting('timezone');
    
    IF timezone_param IS NULL THEN
        final_timezone := original_timezone;
    ELSE
        BEGIN
            EXECUTE format('SET TIME ZONE %L', timezone_param);
        EXCEPTION 
            WHEN invalid_parameter_value THEN
                RAISE EXCEPTION 'Invalid timezone parameter: %', timezone_param
                    USING HINT = 'Please provide a valid timezone identifier';
        END;
        final_timezone := timezone_param;
    END IF;

    dept_name := lower(dept_param[1]);

    IF sub_channels IS NOT NULL AND array_length(sub_channels, 1) > 0 THEN
        -- Check if sub_channels contains only empty strings or spaces
        IF array_length(array(SELECT unnest(sub_channels) FROM unnest(sub_channels) AS unnest_val WHERE trim(unnest_val) <> ''), 1) > 0 THEN
            sub_channel_condition := format('AND wp.sub_channel = ANY(%L)', sub_channels);
        ELSE
            sub_channel_condition := '';  -- Empty condition if only empty strings are present
        END IF;
    END IF;

    BEGIN
        main_query := format($sql$
            INSERT INTO item_smart.lf_master 
			(dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
			updated_at, store_count, written_sales_dollars, compared_week, written_sales_units, written_sales_cost, 
			written_air, written_aur, written_dr_perc, written_backorder_sales_units, written_backorder_sales, 
			cancelled_dollars, cancelled_qty, cancelled_cost, non_delivered_dollars, non_delivered_qty, 
			non_delivered_cost, wei_age_non_delivered_sales_dollars, wei_age_non_delivered_units, 
			wei_age_non_delivered_costs, delivered_returns_dollars, delivered_returns_qty, 
			delivered_returns_cost, delivered_net_sales_dollars, delivered_air, delivered_aur, 
			delivered_drperc, delivered_net_sales_units, delivered_net_sales_cost, delivered_auc, 
			bop_units, bop_cost, bop_auc, atp_units, atp_cost, aoh_units, aoh_cost, total_receipt_cost, 
			total_receipt_units, delivered_gmperc, delivered_gm, on_order_placed_total, on_order_placed_stock, 
			on_order_placed_total_unit, on_order_placed_stock_unit, written_auc, written_cancel_retail_rate_perc, 
			written_cancel_units_rate_perc, written_cancel_cost_rate_perc, delivered_retail_return_rate_perc,
			delivered_unit_return_rate_perc, delivered_cost_return_rate_perc, written_sales_build_ratio, 
			written_sales_units_build_ratio, delivered_net_sales_build_ratio, delivered_net_sales_units_build_ratio, 
			on_order_placed_total_auc, on_order_placed_stock_auc, on_order_placed_spo_auc, eop_cost, 
			total_receipts_auc, stock_receipts_auc, spo_receipts_auc, eop_auc, inv_adj_cost, inv_adj_units, 
			written_imu, delivered_gmroi, inv_adj_cost_perc, inv_adj_units_perc, inv_adj_auc, aoh_fwos_units, 
			aoh_fwos_cost, atp_fwos_units, atp_fwos_cost, retail_conversion_adjustment, on_order_unplaced_total, 
			on_order_unplaced_stock, on_order_unplaced_total_unit, on_order_unplaced_stock_unit, 
			on_order_unplaced_total_auc, on_order_unplaced_stock_auc, l3_name_channel, 
			written_gm_perc, written_gm_dollar, eop_units, written_backorder_aur, cancelled_aur, 
			recomm_receipt_units, recomm_receipt_cost, recomm_receipt_auc, markdown_conv_cost_unit, 
			markdown_conv_cost_dollar, aoh_cost_eop, aoh_units_eop, scenario, actualised, revenue, discount, 
			sub_channel, return_perc, return_units, damage_rate_perc, return_inv, return_dollars, 
			net_sales_dollars, net_sales_units, committed_orders, bop_fwos_units, written_aus)
            SELECT 
			dept, channel, current_week, hierarchy_code, product_type, created_by, NOW() AS created_at, 
			updated_by, updated_at, store_count, written_sales_dollars, compared_week, 
			written_sales_units, written_sales_cost, written_air, written_aur, written_dr_perc, 
			written_backorder_sales_units, written_backorder_sales, cancelled_dollars, 
			cancelled_qty, cancelled_cost, non_delivered_dollars, non_delivered_qty, 
			non_delivered_cost, wei_age_non_delivered_sales_dollars, wei_age_non_delivered_units, 
			wei_age_non_delivered_costs, delivered_returns_dollars, delivered_returns_qty, 
			delivered_returns_cost, delivered_net_sales_dollars, delivered_air, delivered_aur, 
			delivered_drperc, delivered_net_sales_units, delivered_net_sales_cost, delivered_auc, 
			bop_units, bop_cost, bop_auc, atp_units, atp_cost, aoh_units, aoh_cost, total_receipt_cost, 
			total_receipt_units, delivered_gmperc, delivered_gm, on_order_placed_total, on_order_placed_stock,
			on_order_placed_total_unit, on_order_placed_stock_unit, written_auc, written_cancel_retail_rate_perc,
			written_cancel_units_rate_perc, written_cancel_cost_rate_perc, delivered_retail_return_rate_perc,
			delivered_unit_return_rate_perc, delivered_cost_return_rate_perc, written_sales_build_ratio,
			written_sales_units_build_ratio, delivered_net_sales_build_ratio, delivered_net_sales_units_build_ratio,
			on_order_placed_total_auc, on_order_placed_stock_auc, on_order_placed_spo_auc, eop_cost,
			total_receipts_auc, stock_receipts_auc, spo_receipts_auc, eop_auc, inv_adj_cost, inv_adj_units,
			written_imu, delivered_gmroi, inv_adj_cost_perc, inv_adj_units_perc, inv_adj_auc, aoh_fwos_units,
			aoh_fwos_cost, atp_fwos_units, atp_fwos_cost, retail_conversion_adjustment, on_order_unplaced_total,
			on_order_unplaced_stock, on_order_unplaced_total_unit, on_order_unplaced_stock_unit,
			on_order_unplaced_total_auc, on_order_unplaced_stock_auc, l3_name_channel, written_gm_perc,
			written_gm_dollar, eop_units, written_backorder_aur, cancelled_aur, recomm_receipt_units,
			recomm_receipt_cost, recomm_receipt_auc, markdown_conv_cost_unit, markdown_conv_cost_dollar,
			aoh_cost_eop, aoh_units_eop, scenario, actualised, revenue, discount, sub_channel, return_perc,
			return_units, damage_rate_perc, return_inv, return_dollars, net_sales_dollars, net_sales_units,
			committed_orders, bop_fwos_units, written_aus
            FROM item_smart.wp_master_%s wp
            WHERE wp.current_week BETWEEN %L AND %L
                AND wp.channel = ANY(%L)
                %s
            ON CONFLICT (dept, current_week, channel, sub_channel, hierarchy_code)
			DO UPDATE 
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
			    recomm_receipt_units = EXCLUDED.recomm_receipt_units,
			    recomm_receipt_cost = EXCLUDED.recomm_receipt_cost,
			    recomm_receipt_auc = EXCLUDED.recomm_receipt_auc,
			    markdown_conv_cost_unit = EXCLUDED.markdown_conv_cost_unit,
			    markdown_conv_cost_dollar = EXCLUDED.markdown_conv_cost_dollar,
			    aoh_cost_eop = EXCLUDED.aoh_cost_eop,
			    aoh_units_eop = EXCLUDED.aoh_units_eop,
			    scenario = EXCLUDED.scenario,
			    actualised = EXCLUDED.actualised,
			    revenue = EXCLUDED.revenue,
			    discount = EXCLUDED.discount,
			    sub_channel = EXCLUDED.sub_channel,
			    return_perc = EXCLUDED.return_perc,
			    return_units = EXCLUDED.return_units,
			    damage_rate_perc = EXCLUDED.damage_rate_perc,
			    return_inv = EXCLUDED.return_inv,
			    return_dollars = EXCLUDED.return_dollars,
			    net_sales_dollars = EXCLUDED.net_sales_dollars,
			    net_sales_units = EXCLUDED.net_sales_units,
			    committed_orders = EXCLUDED.committed_orders,
			    bop_fwos_units = EXCLUDED.bop_fwos_units,
			    written_aus = EXCLUDED.written_aus;
        $sql$, dept_name, start_week, end_week, channels, sub_channel_condition);

        RAISE NOTICE 'Generated Query: %', main_query;

        EXECUTE main_query;
        GET DIAGNOSTICS rows_inserted = ROW_COUNT;
        RETURN rows_inserted;

    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT, error_context = PG_EXCEPTION_CONTEXT;
            RAISE EXCEPTION 'Unexpected error: % Context: %', error_message, error_context USING ERRCODE = SQLSTATE;
    END;

    EXECUTE format('SET TIME ZONE %L', original_timezone);

	--perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.insert_into_lf', 'before returning rows_inserted', main_query, jsonb_build_object('dept_param',$1, 'start_week',$2, 'end_week',$3, 'channels',$4, 'sub_channels',$5, 'timezone_param',$6));

    RETURN rows_inserted;

EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT, error_context = PG_EXCEPTION_CONTEXT;
        RAISE EXCEPTION 'Critical error: % Context: %', error_message, error_context USING ERRCODE = SQLSTATE;
END;
$function$
;