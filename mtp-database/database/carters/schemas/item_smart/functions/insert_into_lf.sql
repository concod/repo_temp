--liquibase formatted sql
--changeset rahul.chodvadiya@impactanalytics.co:insert_into_lf_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:insert_into_lf_v2
--comment: master plan: insert_into_lf_v2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_into_lf(text[], integer, integer, text[], text);

CREATE OR REPLACE FUNCTION item_smart.insert_into_lf(
    dept_param text[], 
    start_week integer, 
    end_week integer, 
    channels text[], 
    timezone_param text DEFAULT 'US/Eastern'::text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    rows_inserted INT := 0;
    dept_name text;
    original_timezone TEXT;
    error_message TEXT;
    error_context TEXT;
    main_query TEXT;
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

    -- Store original timezone for restoration
    original_timezone := current_setting('timezone');
    
    -- Set timezone if provided and different from current
    IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN
        BEGIN
            EXECUTE format('SET TIME ZONE %L', timezone_param);
        EXCEPTION 
            WHEN invalid_parameter_value THEN
                RAISE EXCEPTION 'Invalid timezone parameter: %', timezone_param
                    USING HINT = 'Please provide a valid timezone identifier';
        END;
    END IF;

    -- Get department name (lowercase)
    dept_name := lower(dept_param[1]);

    -- Build and execute the main query
    BEGIN
        main_query := format($sql$
            INSERT INTO item_smart.lf_master 
				(dept, channel, current_week, hierarchy_code, product_type, created_by, created_at, updated_by,
				updated_at, store_count, written_sales_dollars, compared_week,
				written_sales_units, written_sales_cost, written_air, written_aur, written_dr_perc, 
				bop_units, bop_cost, bop_auc, total_receipt_cost, total_receipt_units, on_order_placed_total, 
				on_order_placed_total_unit, written_auc, on_order_placed_total_auc, eop_cost, eop_auc, written_imu, 
				on_order_unplaced_total, on_order_unplaced_total_unit, on_order_unplaced_total_auc, written_gm_perc, 
				written_gm_dollar, eop_units, recomm_receipt_units, recomm_receipt_cost, recomm_receipt_auc, scenario, 
				actualised, revenue, discount, is_active)
            SELECT 
                dept, channel, current_week, hierarchy_code, product_type, created_by, NOW() AS created_at, updated_by,
                updated_at, store_count, written_sales_dollars, compared_week, 
                written_sales_units, written_sales_cost,
                written_air, written_aur, written_dr_perc, bop_units, bop_cost, bop_auc, total_receipt_cost, 
                total_receipt_units, on_order_placed_total, on_order_placed_total_unit, written_auc,
                on_order_placed_total_auc, eop_cost, eop_auc, written_imu, on_order_unplaced_total,
                on_order_unplaced_total_unit, on_order_unplaced_total_auc, written_gm_perc, written_gm_dollar,
                eop_units, recomm_receipt_units, recomm_receipt_cost, recomm_receipt_auc, scenario, actualised,
                revenue, discount, true as is_active
            FROM item_smart.wp_master_%s wp
            WHERE wp.current_week BETWEEN %L AND %L
                AND wp.channel = ANY(%L)
            ON CONFLICT (dept, current_week, channel, hierarchy_code)
            DO UPDATE SET
                (product_type, created_by, created_at, updated_by, updated_at, store_count,
                written_sales_dollars, compared_week, written_sales_units, written_sales_cost,
                written_air, written_aur, written_dr_perc, bop_units, bop_cost, bop_auc,
                total_receipt_cost, total_receipt_units, on_order_placed_total,
                on_order_placed_total_unit, written_auc, on_order_placed_total_auc,
                eop_cost, eop_auc, written_imu, on_order_unplaced_total,
                on_order_unplaced_total_unit, on_order_unplaced_total_auc,
                written_gm_perc, written_gm_dollar, eop_units, recomm_receipt_units,
                recomm_receipt_cost, recomm_receipt_auc, scenario, actualised, revenue, discount, is_active)
                =
                (EXCLUDED.product_type, EXCLUDED.created_by, EXCLUDED.created_at, EXCLUDED.updated_by,
                EXCLUDED.updated_at, EXCLUDED.store_count, EXCLUDED.written_sales_dollars,
                EXCLUDED.compared_week, EXCLUDED.written_sales_units, EXCLUDED.written_sales_cost,
                EXCLUDED.written_air, EXCLUDED.written_aur, EXCLUDED.written_dr_perc,
                EXCLUDED.bop_units, EXCLUDED.bop_cost, EXCLUDED.bop_auc,
                EXCLUDED.total_receipt_cost, EXCLUDED.total_receipt_units,
                EXCLUDED.on_order_placed_total, EXCLUDED.on_order_placed_total_unit,
                EXCLUDED.written_auc, EXCLUDED.on_order_placed_total_auc, EXCLUDED.eop_cost,
                EXCLUDED.eop_auc, EXCLUDED.written_imu, EXCLUDED.on_order_unplaced_total,
                EXCLUDED.on_order_unplaced_total_unit, EXCLUDED.on_order_unplaced_total_auc,
                EXCLUDED.written_gm_perc, EXCLUDED.written_gm_dollar, EXCLUDED.eop_units,
                EXCLUDED.recomm_receipt_units, EXCLUDED.recomm_receipt_cost,
                EXCLUDED.recomm_receipt_auc, EXCLUDED.scenario, EXCLUDED.actualised,
                EXCLUDED.revenue, EXCLUDED.discount, EXCLUDED.is_active);
        $sql$, dept_name, start_week, end_week, channels);

        -- Execute the query
        EXECUTE main_query;
        GET DIAGNOSTICS rows_inserted = ROW_COUNT;

        -- Restore original timezone if it was changed
        IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN
            EXECUTE format('SET TIME ZONE %L', original_timezone);
        END IF;

        RETURN rows_inserted;

    EXCEPTION
        WHEN OTHERS THEN
            -- Restore timezone before re-raising exception
            IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN
                BEGIN
                    EXECUTE format('SET TIME ZONE %L', original_timezone);
                EXCEPTION
                    WHEN OTHERS THEN
                        -- Log timezone restoration failure but don't mask original error
                        RAISE WARNING 'Failed to restore timezone to %', original_timezone;
                END;
            END IF;
            
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT, error_context = PG_EXCEPTION_CONTEXT;
            RAISE EXCEPTION 'Query execution failed: % Context: %', error_message, error_context 
                USING ERRCODE = SQLSTATE;
    END;

EXCEPTION
    WHEN OTHERS THEN
        -- Ensure timezone is restored even in case of outer exceptions
        IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN
            BEGIN
                EXECUTE format('SET TIME ZONE %L', original_timezone);
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to restore timezone to %', original_timezone;
            END;
        END IF;
        
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT, error_context = PG_EXCEPTION_CONTEXT;
        RAISE EXCEPTION 'Function execution failed: % Context: %', error_message, error_context 
            USING ERRCODE = SQLSTATE;
END;
$function$;