--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_into_op_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:insert_into_op_v3
--comment: initial changeset for insert_into_op_v3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_into_op_v3(_text, int4, int4, _text, _text, _text, text);

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
    -- where_clause_c_sc_format := array_to_string(where_clause_c_sc, ' AND ');

    where_clause_c_sc_format := CASE 
        WHEN where_clause_c_sc IS NULL OR array_length(where_clause_c_sc, 1) IS NULL OR array_length(where_clause_c_sc, 1) = 0 
        THEN '' 
        ELSE array_to_string(where_clause_c_sc, ' AND ') 
    END;


    
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
			(hierarchy_code, compared_week, current_week, channel, sub_channel, dept, 
			written_sales_dollars, written_auc, auc_first, auc_landed, bop_units, bop_cost, 
			bop_auc, eop_units, eop_cost, eop_auc, total_receipt_units, total_receipt_cost, 
			total_receipt_auc, on_order_placed_total_unit, on_order_placed_total, 
			recommended_u_supply, total_supply_plan, recomm_receipt_units, 
			target_sellthrough_perc, forecasted_sellthrough_perc, warranty_units, warranty_dollar, 
			zero_dollar_orders_units, zero_dollar_orders_dollar, container_count, fwos, 
			discount_perc, rtp_sales_units_perc, rtp_units, rtp_dollar, warranty_sales_units_perc, 
			zero_dollar_orders_perc, is_active, written_sales_units, written_air, written_dr_perc, 
			written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur, 
			discount, scenario, actualised, created_at, updated_at, created_by, updated_by, 
			on_order_placed_total_auc, on_order_placed_total_cost, on_order_unplaced_total_auc, 
			on_order_unplaced_total_cost, recomm_receipt_auc, recomm_receipt_msrp, 
			recomm_receipt_msrp_per_unit, on_order_unplaced_total_unit, on_order_unplaced_total, 
			revenue)
            SELECT 
			hierarchy_code, compared_week, current_week, channel, sub_channel, dept, 
			written_sales_dollars, written_auc, auc_first, auc_landed, bop_units, bop_cost, 
			bop_auc, eop_units, eop_cost, eop_auc, total_receipt_units, total_receipt_cost, 
			total_receipt_auc, on_order_placed_total_unit, on_order_placed_total, 
			recommended_u_supply, total_supply_plan, recomm_receipt_units, 
			target_sellthrough_perc, forecasted_sellthrough_perc, warranty_units, warranty_dollar, 
			zero_dollar_orders_units, zero_dollar_orders_dollar, container_count, fwos, 
			discount_perc, rtp_sales_units_perc, rtp_units, rtp_dollar, warranty_sales_units_perc, 
			zero_dollar_orders_perc, is_active, written_sales_units, written_air, written_dr_perc, 
			written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur, 
			discount, scenario, actualised, NOW() AS created_at, NOW() AS updated_at, 
			created_by, updated_by, on_order_placed_total_auc, on_order_placed_total_cost, 
			on_order_unplaced_total_auc, on_order_unplaced_total_cost, recomm_receipt_auc, 
			recomm_receipt_msrp, recomm_receipt_msrp_per_unit, on_order_unplaced_total_unit, 
			on_order_unplaced_total, revenue
        FROM
            item_smart.wp_master_%s wp
        WHERE
            wp.current_week BETWEEN %L AND %L
            %s %s
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
                (compared_week, written_sales_dollars, written_auc, auc_first, auc_landed, bop_units, bop_cost, 
                bop_auc, eop_units, eop_cost, eop_auc, total_receipt_units, total_receipt_cost, 
                total_receipt_auc, on_order_placed_total_unit, on_order_placed_total, 
                recommended_u_supply, total_supply_plan, recomm_receipt_units, 
                target_sellthrough_perc, forecasted_sellthrough_perc, warranty_units, warranty_dollar, 
                zero_dollar_orders_units, zero_dollar_orders_dollar, container_count, fwos, 
                discount_perc, rtp_sales_units_perc, rtp_units, rtp_dollar, warranty_sales_units_perc, 
                zero_dollar_orders_perc, is_active, written_sales_units, written_air, written_dr_perc, 
                written_imu, written_sales_cost, written_gm_perc, written_gm_dollar, written_aur, 
                discount, scenario, actualised, created_at, updated_at, created_by, updated_by, 
                on_order_placed_total_auc, on_order_placed_total_cost, on_order_unplaced_total_auc, 
                on_order_unplaced_total_cost, recomm_receipt_auc, recomm_receipt_msrp, 
                recomm_receipt_msrp_per_unit, on_order_unplaced_total_unit, on_order_unplaced_total, 
                revenue)
                = 
                (EXCLUDED.compared_week, EXCLUDED.written_sales_dollars, EXCLUDED.written_auc, 
                EXCLUDED.auc_first, EXCLUDED.auc_landed, EXCLUDED.bop_units, EXCLUDED.bop_cost, 
                EXCLUDED.bop_auc, EXCLUDED.eop_units, EXCLUDED.eop_cost, EXCLUDED.eop_auc, 
                EXCLUDED.total_receipt_units, EXCLUDED.total_receipt_cost, EXCLUDED.total_receipt_auc, 
                EXCLUDED.on_order_placed_total_unit, EXCLUDED.on_order_placed_total, 
                EXCLUDED.recommended_u_supply, EXCLUDED.total_supply_plan, EXCLUDED.recomm_receipt_units, 
                EXCLUDED.target_sellthrough_perc, EXCLUDED.forecasted_sellthrough_perc, 
                EXCLUDED.warranty_units, EXCLUDED.warranty_dollar, EXCLUDED.zero_dollar_orders_units, 
                EXCLUDED.zero_dollar_orders_dollar, EXCLUDED.container_count, EXCLUDED.fwos, 
                EXCLUDED.discount_perc, EXCLUDED.rtp_sales_units_perc, EXCLUDED.rtp_units, 
                EXCLUDED.rtp_dollar, EXCLUDED.warranty_sales_units_perc, EXCLUDED.zero_dollar_orders_perc, 
                EXCLUDED.is_active, EXCLUDED.written_sales_units, EXCLUDED.written_air, 
                EXCLUDED.written_dr_perc, EXCLUDED.written_imu, EXCLUDED.written_sales_cost, 
                EXCLUDED.written_gm_perc, EXCLUDED.written_gm_dollar, EXCLUDED.written_aur, 
                EXCLUDED.discount, EXCLUDED.scenario, EXCLUDED.actualised, EXCLUDED.created_at, 
                EXCLUDED.updated_at, EXCLUDED.created_by, EXCLUDED.updated_by, 
                EXCLUDED.on_order_placed_total_auc, EXCLUDED.on_order_placed_total_cost, 
                EXCLUDED.on_order_unplaced_total_auc, EXCLUDED.on_order_unplaced_total_cost, 
                EXCLUDED.recomm_receipt_auc, EXCLUDED.recomm_receipt_msrp, 
                EXCLUDED.recomm_receipt_msrp_per_unit, EXCLUDED.on_order_unplaced_total_unit, 
                EXCLUDED.on_order_unplaced_total, EXCLUDED.revenue);
        $sql$,
        dept_name_part,
        start_week,
        end_week,
        CASE WHEN where_clause_c_sc_format != '' THEN 'AND' ELSE '' END,
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