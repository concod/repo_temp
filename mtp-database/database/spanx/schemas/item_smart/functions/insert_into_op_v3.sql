--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_into_op_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:insert_into_op_v3
--comment: insert_into_op_v3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_into_op_v3(text[], integer, integer, text[], text[], text[], text);

CREATE OR REPLACE FUNCTION item_smart.insert_into_op_v3(dept_param text[], start_week integer, end_week integer, channels text[], where_clause_mv text[], where_clause_c_sc text[], timezone_param text DEFAULT 'US/Eastern'::text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE 
    rows_inserted INT := 0;
    dept_name text;
    dept_name_part text;
    final_timezone TEXT;
    original_timezone TEXT;
    error_message TEXT;
    error_context TEXT;
    main_query TEXT;
    where_clause_mv_format TEXT;
    where_clause_c_sc_format TEXT;
    channels_format TEXT;
BEGIN 
    -- Input validation
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

    -- Store original timezone and set new one if provided 
    original_timezone := current_setting('timezone');

    IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN 
        BEGIN 
            EXECUTE format('SET TIME ZONE %L', timezone_param);
            final_timezone := timezone_param;
        EXCEPTION
            WHEN invalid_parameter_value THEN 
                RAISE EXCEPTION 'Invalid timezone parameter: %', timezone_param 
                USING HINT = 'Please provide a valid timezone identifier';
        END;
    ELSE
        final_timezone := original_timezone;
    END IF;

    -- Process department name
    dept_name := lower(dept_param[1]);
    dept_name_part := regexp_replace(dept_name, '[ /.-]', '', 'g');

    -- Format where clauses
    where_clause_mv_format := array_to_string(where_clause_mv, ' AND ');
    where_clause_c_sc_format := array_to_string(where_clause_c_sc, ' AND ');
    
    -- Format channels for IN clause
    channels_format := array_to_string(ARRAY(
        SELECT quote_literal(unnest(channels))
    ), ',');

    RAISE NOTICE 'where_clause_mv_format: %', where_clause_mv_format;
    RAISE NOTICE 'where_clause_c_sc_format: %', where_clause_c_sc_format;
    RAISE NOTICE 'channels_format: %', channels_format;

    -- Construct main query
    main_query := format(
        $sql$
        INSERT INTO item_smart.op_master 
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
			net_sales_dollars, net_sales_units, committed_orders, bop_fwos_units, written_aus,cust_price)
            SELECT 
			dept, channel, current_week, hierarchy_code, product_type, created_by, NOW() AS created_at, 
			updated_by, NOW() AS updated_at, store_count, written_sales_dollars, compared_week, 
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
			committed_orders, bop_fwos_units, written_aus,cust_price
        FROM
            item_smart.wp_master_%s wp
        WHERE
            wp.current_week BETWEEN %L AND %L
            AND %s
            AND wp.hierarchy_code IN (
                SELECT mv.hierarchy_code 
                FROM item_smart.mv_product_hierarchies_filter mv 
                WHERE %s
                UNION
                SELECT mv.hierarchy_code 
                FROM item_smart.placeholders_info mv 
                WHERE %s
            )
        	ON CONFLICT (dept, current_week, channel, sub_channel, hierarchy_code)
            DO UPDATE SET
                (product_type, created_by, created_at, updated_by, updated_at, store_count,
                written_sales_dollars, compared_week, written_sales_units, written_sales_cost,
                written_air, written_aur, written_dr_perc, written_backorder_sales_units,
                written_backorder_sales, cancelled_dollars, cancelled_qty, cancelled_cost,
                non_delivered_dollars, non_delivered_qty, non_delivered_cost,
                wei_age_non_delivered_sales_dollars, wei_age_non_delivered_units,
                wei_age_non_delivered_costs, delivered_returns_dollars, delivered_returns_qty,
                delivered_returns_cost, delivered_net_sales_dollars, delivered_air, delivered_aur,
                delivered_drperc, delivered_net_sales_units, delivered_net_sales_cost, delivered_auc,
                bop_units, bop_cost, bop_auc, atp_units, atp_cost, aoh_units, aoh_cost,
                total_receipt_cost, total_receipt_units, delivered_gmperc, delivered_gm,
                on_order_placed_total, on_order_placed_stock, on_order_placed_total_unit,
                on_order_placed_stock_unit, written_auc, written_cancel_retail_rate_perc,
                written_cancel_units_rate_perc, written_cancel_cost_rate_perc,
                delivered_retail_return_rate_perc, delivered_unit_return_rate_perc,
                delivered_cost_return_rate_perc, written_sales_build_ratio,
                written_sales_units_build_ratio, delivered_net_sales_build_ratio,
                delivered_net_sales_units_build_ratio, on_order_placed_total_auc,
                on_order_placed_stock_auc, on_order_placed_spo_auc, eop_cost,
                total_receipts_auc, stock_receipts_auc, spo_receipts_auc, eop_auc,
                inv_adj_cost, inv_adj_units, written_imu, delivered_gmroi,
                inv_adj_cost_perc, inv_adj_units_perc, inv_adj_auc, aoh_fwos_units,
                aoh_fwos_cost, atp_fwos_units, atp_fwos_cost, retail_conversion_adjustment,
                on_order_unplaced_total, on_order_unplaced_stock, on_order_unplaced_total_unit,
                on_order_unplaced_stock_unit, on_order_unplaced_total_auc, on_order_unplaced_stock_auc,
                l3_name_channel, written_gm_perc, written_gm_dollar, eop_units,
                written_backorder_aur, cancelled_aur, recomm_receipt_units,
                recomm_receipt_cost, recomm_receipt_auc, markdown_conv_cost_unit,
                markdown_conv_cost_dollar, aoh_cost_eop, aoh_units_eop, scenario,
                actualised, revenue, discount, sub_channel, return_perc,
                return_units, damage_rate_perc, return_inv, return_dollars,
                net_sales_dollars, net_sales_units, committed_orders, bop_fwos_units, written_aus,cust_price)
                = 
                (EXCLUDED.product_type, EXCLUDED.created_by, EXCLUDED.created_at, EXCLUDED.updated_by,
                EXCLUDED.updated_at, EXCLUDED.store_count, EXCLUDED.written_sales_dollars,
                EXCLUDED.compared_week, EXCLUDED.written_sales_units, EXCLUDED.written_sales_cost,
                EXCLUDED.written_air, EXCLUDED.written_aur, EXCLUDED.written_dr_perc,
                EXCLUDED.written_backorder_sales_units, EXCLUDED.written_backorder_sales,
                EXCLUDED.cancelled_dollars, EXCLUDED.cancelled_qty, EXCLUDED.cancelled_cost,
                EXCLUDED.non_delivered_dollars, EXCLUDED.non_delivered_qty, EXCLUDED.non_delivered_cost,
                EXCLUDED.wei_age_non_delivered_sales_dollars, EXCLUDED.wei_age_non_delivered_units,
                EXCLUDED.wei_age_non_delivered_costs, EXCLUDED.delivered_returns_dollars,
                EXCLUDED.delivered_returns_qty, EXCLUDED.delivered_returns_cost,
                EXCLUDED.delivered_net_sales_dollars, EXCLUDED.delivered_air, EXCLUDED.delivered_aur,
                EXCLUDED.delivered_drperc, EXCLUDED.delivered_net_sales_units,
                EXCLUDED.delivered_net_sales_cost, EXCLUDED.delivered_auc, EXCLUDED.bop_units,
                EXCLUDED.bop_cost, EXCLUDED.bop_auc, EXCLUDED.atp_units, EXCLUDED.atp_cost,
                EXCLUDED.aoh_units, EXCLUDED.aoh_cost, EXCLUDED.total_receipt_cost,
                EXCLUDED.total_receipt_units, EXCLUDED.delivered_gmperc, EXCLUDED.delivered_gm,
                EXCLUDED.on_order_placed_total, EXCLUDED.on_order_placed_stock,
                EXCLUDED.on_order_placed_total_unit, EXCLUDED.on_order_placed_stock_unit,
                EXCLUDED.written_auc, EXCLUDED.written_cancel_retail_rate_perc,
                EXCLUDED.written_cancel_units_rate_perc, EXCLUDED.written_cancel_cost_rate_perc,
                EXCLUDED.delivered_retail_return_rate_perc, EXCLUDED.delivered_unit_return_rate_perc,
                EXCLUDED.delivered_cost_return_rate_perc, EXCLUDED.written_sales_build_ratio,
                EXCLUDED.written_sales_units_build_ratio, EXCLUDED.delivered_net_sales_build_ratio,
                EXCLUDED.delivered_net_sales_units_build_ratio, EXCLUDED.on_order_placed_total_auc,
                EXCLUDED.on_order_placed_stock_auc, EXCLUDED.on_order_placed_spo_auc,
                EXCLUDED.eop_cost, EXCLUDED.total_receipts_auc, EXCLUDED.stock_receipts_auc,
                EXCLUDED.spo_receipts_auc, EXCLUDED.eop_auc, EXCLUDED.inv_adj_cost,
                EXCLUDED.inv_adj_units, EXCLUDED.written_imu, EXCLUDED.delivered_gmroi,
                EXCLUDED.inv_adj_cost_perc, EXCLUDED.inv_adj_units_perc, EXCLUDED.inv_adj_auc,
                EXCLUDED.aoh_fwos_units, EXCLUDED.aoh_fwos_cost, EXCLUDED.atp_fwos_units,
                EXCLUDED.atp_fwos_cost, EXCLUDED.retail_conversion_adjustment,
                EXCLUDED.on_order_unplaced_total, EXCLUDED.on_order_unplaced_stock,
                EXCLUDED.on_order_unplaced_total_unit, EXCLUDED.on_order_unplaced_stock_unit,
                EXCLUDED.on_order_unplaced_total_auc, EXCLUDED.on_order_unplaced_stock_auc,
                EXCLUDED.l3_name_channel, EXCLUDED.written_gm_perc, EXCLUDED.written_gm_dollar,
                EXCLUDED.eop_units, EXCLUDED.written_backorder_aur, EXCLUDED.cancelled_aur,
                EXCLUDED.recomm_receipt_units, EXCLUDED.recomm_receipt_cost, EXCLUDED.recomm_receipt_auc,
                EXCLUDED.markdown_conv_cost_unit, EXCLUDED.markdown_conv_cost_dollar,
                EXCLUDED.aoh_cost_eop, EXCLUDED.aoh_units_eop, EXCLUDED.scenario,
                EXCLUDED.actualised, EXCLUDED.revenue, EXCLUDED.discount, EXCLUDED.sub_channel,
                EXCLUDED.return_perc, EXCLUDED.return_units, EXCLUDED.damage_rate_perc,
                EXCLUDED.return_inv, EXCLUDED.return_dollars, EXCLUDED.net_sales_dollars,
                EXCLUDED.net_sales_units, EXCLUDED.committed_orders, EXCLUDED.bop_fwos_units,
                EXCLUDED.written_aus,EXCLUDED.cust_price);
        $sql$,
        dept_name_part,
        start_week,
        end_week,
        where_clause_c_sc_format,
        where_clause_mv_format,
        where_clause_mv_format
    );

    RAISE NOTICE 'Generated Query: %', main_query;

    -- Execute the query
    EXECUTE main_query;
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;

    -- Restore original timezone
    IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN
        EXECUTE format('SET TIME ZONE %L', original_timezone);
    END IF;

    RETURN rows_inserted;

EXCEPTION
    WHEN OTHERS THEN
        -- Restore original timezone on error
        IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN
            BEGIN
                EXECUTE format('SET TIME ZONE %L', original_timezone);
            EXCEPTION
                WHEN OTHERS THEN
                    -- Ignore timezone restore errors
                    NULL;
            END;
        END IF;
        
        GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_context = PG_EXCEPTION_CONTEXT;
        
        RAISE EXCEPTION 'Function execution failed: % Context: %', 
            error_message, error_context 
            USING ERRCODE = SQLSTATE;
END;
$function$
;