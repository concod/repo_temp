--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_into_lf_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:insert_into_lf_v3-updated
--comment: insert_into_lf_v3-updated
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_into_lf_v3(dept_param text[], start_week integer, end_week integer, channels text[], where_clause_mv text[], where_clause_c_sc text[], timezone_param text);

CREATE OR REPLACE FUNCTION item_smart.insert_into_lf_v3(
    dept_param text[], 
    start_week integer, 
    end_week integer, 
    channels text[], 
    where_clause_mv text[], 
    where_clause_c_sc text[], 
    timezone_param text DEFAULT 'US/Eastern'::text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    rows_inserted INT := 0;
    dept_name TEXT;
    original_timezone TEXT;
    error_message TEXT;
    error_context TEXT;
    main_query TEXT;
    where_clause_mv_formatted TEXT;
    where_clause_c_sc_formatted TEXT;
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

    IF where_clause_mv IS NULL OR array_length(where_clause_mv, 1) = 0 THEN
        RAISE EXCEPTION 'where_clause_mv parameter cannot be null or empty';
    END IF;

    IF where_clause_c_sc IS NULL OR array_length(where_clause_c_sc, 1) = 0 THEN
        RAISE EXCEPTION 'where_clause_c_sc parameter cannot be null or empty';
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

    -- Format where clauses safely
    where_clause_mv_formatted := array_to_string(where_clause_mv, ' AND ');
    where_clause_c_sc_formatted := array_to_string(where_clause_c_sc, ' AND ');

    -- Log formatted where clauses for debugging
    RAISE NOTICE 'where_clause_mv_formatted: %', where_clause_mv_formatted;
    RAISE NOTICE 'where_clause_c_sc_formatted: %', where_clause_c_sc_formatted;
    
    -- Build and execute the main query
    BEGIN
        -- Construct the main insert query
        main_query := format($query$
            INSERT INTO item_smart.lf_master (
                written_sales_units,written_sales_dollars,written_sales_cost,written_imu,written_gm_perc,
                written_gm_dollar,written_dr_perc,written_aur,written_auc,written_air,updated_by,updated_at,
                total_receipt_units,total_receipt_msrp_per_unit,total_receipt_msrp,total_receipt_cost,
                total_receipt_auc,store_count,scenario,revenue,recomm_receipt_units,recomm_receipt_msrp_per_unit,
                recomm_receipt_msrp,recomm_receipt_cost,recomm_receipt_auc,product_type,on_order_unplaced_total_unit,
                on_order_unplaced_total_auc,on_order_unplaced_total,on_order_placed_total_unit,
                on_order_placed_total_auc,on_order_placed_total,on_order_placed_msrp_per_unit,on_order_placed_msrp,
                omnia_forecast_units,is_active,hierarchy_code,fwos,eop_units_ecom,eop_units_bnm_store,eop_units_bnm_dc,
                eop_units,eop_cost_ecom,eop_cost_bnm_store,eop_cost_bnm_dc,eop_cost,eop_auc_ecom,eop_auc_bnm_store,
                eop_auc_bnm_dc,eop_auc,discount,dept,current_week,created_by,created_at,compared_week,channel,
                bop_units_ecom,bop_units_bnm_store,bop_units_bnm_dc,bop_units,bop_cost_ecom,bop_cost_bnm_store,
                bop_cost_bnm_dc,bop_cost,bop_auc_ecom,bop_auc_bnm_store,bop_auc_bnm_dc,bop_auc,actualised
            )
            SELECT 
                written_sales_units,written_sales_dollars,written_sales_cost,written_imu,written_gm_perc,
                written_gm_dollar,written_dr_perc,written_aur,written_auc,written_air,updated_by,NOW() AS updated_at,
                total_receipt_units,total_receipt_msrp_per_unit,total_receipt_msrp,total_receipt_cost,
                total_receipt_auc,store_count,scenario,revenue,recomm_receipt_units,recomm_receipt_msrp_per_unit,
                recomm_receipt_msrp,recomm_receipt_cost,recomm_receipt_auc,product_type,on_order_unplaced_total_unit,
                on_order_unplaced_total_auc,on_order_unplaced_total,on_order_placed_total_unit,
                on_order_placed_total_auc,on_order_placed_total,on_order_placed_msrp_per_unit,on_order_placed_msrp,
                omnia_forecast_units,true as is_active,hierarchy_code,fwos,eop_units_ecom,eop_units_bnm_store,eop_units_bnm_dc,
                eop_units,eop_cost_ecom,eop_cost_bnm_store,eop_cost_bnm_dc,eop_cost,eop_auc_ecom,eop_auc_bnm_store,
                eop_auc_bnm_dc,eop_auc,discount,dept,current_week,created_by,NOW() AS created_at,compared_week,channel,
                bop_units_ecom,bop_units_bnm_store,bop_units_bnm_dc,bop_units,bop_cost_ecom,bop_cost_bnm_store,
                bop_cost_bnm_dc,bop_cost,bop_auc_ecom,bop_auc_bnm_store,bop_auc_bnm_dc,bop_auc,actualised

            FROM item_smart.wp_master_%I wp
            WHERE wp.current_week BETWEEN %s AND %s
                AND (%s)
                AND wp.hierarchy_code IN (
                    SELECT mv.hierarchy_code 
                    FROM item_smart.mv_product_hierarchies_filter mv 
                    WHERE %s
                    UNION
                    SELECT mv.hierarchy_code 
                    FROM item_smart.placeholders_info mv 
                    WHERE %s
                )
            ON CONFLICT (dept, current_week, channel, hierarchy_code)
            DO UPDATE SET
                (written_sales_units, written_sales_dollars, written_sales_cost, written_imu, written_gm_perc,
                written_gm_dollar, written_dr_perc, written_aur, written_auc, written_air, updated_by, updated_at,
                total_receipt_units, total_receipt_msrp_per_unit, total_receipt_msrp, total_receipt_cost,
                total_receipt_auc, store_count, scenario, revenue, recomm_receipt_units, recomm_receipt_msrp_per_unit,
                recomm_receipt_msrp, recomm_receipt_cost, recomm_receipt_auc, product_type, on_order_unplaced_total_unit,
                on_order_unplaced_total_auc, on_order_unplaced_total, on_order_placed_total_unit,
                on_order_placed_total_auc, on_order_placed_total, on_order_placed_msrp_per_unit, on_order_placed_msrp,
                omnia_forecast_units, is_active, fwos, eop_units_ecom, eop_units_bnm_store, eop_units_bnm_dc,
                eop_units, eop_cost_ecom, eop_cost_bnm_store, eop_cost_bnm_dc, eop_cost, eop_auc_ecom, eop_auc_bnm_store,
                eop_auc_bnm_dc, eop_auc, discount, created_by, created_at, compared_week,
                bop_units_ecom, bop_units_bnm_store, bop_units_bnm_dc, bop_units, bop_cost_ecom, bop_cost_bnm_store,
                bop_cost_bnm_dc, bop_cost, bop_auc_ecom, bop_auc_bnm_store, bop_auc_bnm_dc, bop_auc, actualised)
                = 
                (EXCLUDED.written_sales_units, EXCLUDED.written_sales_dollars, EXCLUDED.written_sales_cost, EXCLUDED.written_imu, EXCLUDED.written_gm_perc,
                EXCLUDED.written_gm_dollar, EXCLUDED.written_dr_perc, EXCLUDED.written_aur, EXCLUDED.written_auc, EXCLUDED.written_air, EXCLUDED.updated_by, EXCLUDED.updated_at,
                EXCLUDED.total_receipt_units, EXCLUDED.total_receipt_msrp_per_unit, EXCLUDED.total_receipt_msrp, EXCLUDED.total_receipt_cost,
                EXCLUDED.total_receipt_auc, EXCLUDED.store_count, EXCLUDED.scenario, EXCLUDED.revenue, EXCLUDED.recomm_receipt_units, EXCLUDED.recomm_receipt_msrp_per_unit,
                EXCLUDED.recomm_receipt_msrp, EXCLUDED.recomm_receipt_cost, EXCLUDED.recomm_receipt_auc, EXCLUDED.product_type, EXCLUDED.on_order_unplaced_total_unit,
                EXCLUDED.on_order_unplaced_total_auc, EXCLUDED.on_order_unplaced_total, EXCLUDED.on_order_placed_total_unit,
                EXCLUDED.on_order_placed_total_auc, EXCLUDED.on_order_placed_total, EXCLUDED.on_order_placed_msrp_per_unit, EXCLUDED.on_order_placed_msrp,
                EXCLUDED.omnia_forecast_units, EXCLUDED.is_active, EXCLUDED.fwos, EXCLUDED.eop_units_ecom, EXCLUDED.eop_units_bnm_store, EXCLUDED.eop_units_bnm_dc,
                EXCLUDED.eop_units, EXCLUDED.eop_cost_ecom, EXCLUDED.eop_cost_bnm_store, EXCLUDED.eop_cost_bnm_dc, EXCLUDED.eop_cost, EXCLUDED.eop_auc_ecom, EXCLUDED.eop_auc_bnm_store,
                EXCLUDED.eop_auc_bnm_dc, EXCLUDED.eop_auc, EXCLUDED.discount, EXCLUDED.created_by, EXCLUDED.created_at, EXCLUDED.compared_week,
                EXCLUDED.bop_units_ecom, EXCLUDED.bop_units_bnm_store, EXCLUDED.bop_units_bnm_dc, EXCLUDED.bop_units, EXCLUDED.bop_cost_ecom, EXCLUDED.bop_cost_bnm_store,
                EXCLUDED.bop_cost_bnm_dc, EXCLUDED.bop_cost, EXCLUDED.bop_auc_ecom, EXCLUDED.bop_auc_bnm_store, EXCLUDED.bop_auc_bnm_dc, EXCLUDED.bop_auc, EXCLUDED.actualised)
        $query$, 
            dept_name,                          -- %I for identifier (safe table name)
            start_week,                         -- %s for BETWEEN start
            end_week,                           -- %s for BETWEEN end
            where_clause_c_sc_formatted,        -- %s for WHERE clause (validated input)
            where_clause_mv_formatted,           -- %s for WHERE clause (validated input)
            where_clause_mv_formatted           -- %s for WHERE clause (validated input)
        );

        -- Log the constructed query for debugging 
        RAISE NOTICE 'Executing main query: %', main_query;

        -- Execute the query and get row count
        EXECUTE main_query;
        GET DIAGNOSTICS rows_inserted = ROW_COUNT;

        -- Log successful execution
        RAISE NOTICE 'Successfully inserted/updated % rows', rows_inserted;

    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT, error_context = PG_EXCEPTION_CONTEXT;
            RAISE EXCEPTION 'Query execution failed: %. Context: %', error_message, error_context;
    END;

    -- Restore original timezone
    IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN
        BEGIN
            EXECUTE format('SET TIME ZONE %L', original_timezone);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to restore timezone to %', original_timezone;
        END;
    END IF;

    RETURN rows_inserted;

EXCEPTION
    WHEN OTHERS THEN
        -- Ensure timezone is restored in case of any exception
        IF timezone_param IS NOT NULL AND timezone_param != original_timezone THEN
            BEGIN
                EXECUTE format('SET TIME ZONE %L', original_timezone);
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to restore timezone to %', original_timezone;
            END;
        END IF;
        
        -- Re-raise the original exception
        RAISE;
END;
$function$
;