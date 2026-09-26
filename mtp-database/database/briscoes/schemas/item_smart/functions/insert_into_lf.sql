--liquibase formatted sql
--changeset rahul.chodvadiya@impactanalytics.co:insert_into_lf_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_master_plan_updates
--comment: master plan: approve as last finalized
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.insert_into_lf(_text, int4, int4, _text, text);

CREATE OR REPLACE FUNCTION item_smart.insert_into_lf(
    dept_param text [],
    start_week integer,
    end_week integer,
    channels text [],
    timezone_param text DEFAULT 'US/Eastern' :: text
) RETURNS integer LANGUAGE plpgsql AS $function$ 

    DECLARE rows_inserted INT := 0;

    dept_name text;
    dept_name_part text;
    final_timezone TEXT;
    original_timezone TEXT;
    error_message TEXT;
    error_context TEXT;
    main_query TEXT;

    BEGIN 
    
    IF dept_param IS NULL
    OR array_length(dept_param, 1) = 0 THEN RAISE EXCEPTION 'Department parameter cannot be null or empty';
    END IF;

    IF start_week IS NULL
    OR end_week IS NULL THEN RAISE EXCEPTION 'Start week and end week parameters cannot be null';
    END IF;

    IF start_week > end_week THEN RAISE EXCEPTION 'Start week cannot be greater than end week';
    END IF;

    IF channels IS NULL
    OR array_length(channels, 1) = 0 THEN RAISE EXCEPTION 'Channels parameter cannot be null or empty';
    END IF;

    original_timezone := current_setting('timezone');

    IF timezone_param IS NULL THEN final_timezone := original_timezone;
    ELSE BEGIN EXECUTE format('SET TIME ZONE %L', timezone_param);

    EXCEPTION
        WHEN invalid_parameter_value THEN RAISE EXCEPTION 'Invalid timezone parameter: %',
        timezone_param USING HINT = 'Please provide a valid timezone identifier';

    END;

    final_timezone := timezone_param;
    END IF;

    dept_name := lower(dept_param[1]);
    dept_name_part := regexp_replace(dept_name, '[ /.-]', '', 'g');

    BEGIN main_query := format($sql$
        INSERT INTO item_smart.lf_master (
            dept,
            channel,
            current_week,
            hierarchy_code,
            product_type,
            created_by,
            created_at,
            updated_by,
            updated_at,
            store_count,
            written_sales_dollars,
            compared_week,
            written_sales_units,
            written_sales_cost,
            written_air,
            written_aur,
            written_dr_perc,
            bop_units,
            bop_cost,
            bop_auc,
            total_receipt_cost,
            total_receipt_units,
            on_order_placed_total,
            on_order_placed_total_unit,
            written_auc,
            on_order_placed_total_auc,
            eop_cost,
            eop_auc,
            written_imu,
            on_order_unplaced_total,
            on_order_unplaced_total_unit,
            on_order_unplaced_total_auc,
            written_gm_perc,
            written_gm_dollar,
            eop_units,
            recomm_receipt_units,
            recomm_receipt_cost,
            recomm_receipt_auc,
            scenario,
            actualised,
            revenue,
            discount
        )
        SELECT
            dept,
            channel,
            current_week,
            hierarchy_code,
            product_type,
            created_by,
            NOW() AS created_at,
            updated_by,
            NOW() AS updated_at,
            store_count,
            written_sales_dollars,
            compared_week,
            written_sales_units,
            written_sales_cost,
            written_air,
            written_aur,
            written_dr_perc,
            bop_units,
            bop_cost,
            bop_auc,
            total_receipt_cost,
            total_receipt_units,
            on_order_placed_total,
            on_order_placed_total_unit,
            written_auc,
            on_order_placed_total_auc,
            eop_cost,
            eop_auc,
            written_imu,
            on_order_unplaced_total,
            on_order_unplaced_total_unit,
            on_order_unplaced_total_auc,
            written_gm_perc,
            written_gm_dollar,
            eop_units,
            recomm_receipt_units,
            recomm_receipt_cost,
            recomm_receipt_auc,
            scenario,
            actualised,
            revenue,
            discount
        FROM
            item_smart.wp_master_%s wp
        WHERE
            wp.current_week BETWEEN %L
            AND %L
            AND wp.channel = ANY(%L) ON CONFLICT (dept, current_week, channel, hierarchy_code) 
        DO UPDATE SET
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
            bop_units = EXCLUDED.bop_units,
            bop_cost = EXCLUDED.bop_cost,
            bop_auc = EXCLUDED.bop_auc,
            total_receipt_cost = EXCLUDED.total_receipt_cost,
            total_receipt_units = EXCLUDED.total_receipt_units,
            on_order_placed_total = EXCLUDED.on_order_placed_total,
            on_order_placed_total_unit = EXCLUDED.on_order_placed_total_unit,
            written_auc = EXCLUDED.written_auc,
            on_order_placed_total_auc = EXCLUDED.on_order_placed_total_auc,
            eop_cost = EXCLUDED.eop_cost,
            eop_auc = EXCLUDED.eop_auc,
            written_imu = EXCLUDED.written_imu,
            on_order_unplaced_total = EXCLUDED.on_order_unplaced_total,
            on_order_unplaced_total_unit = EXCLUDED.on_order_unplaced_total_unit,
            on_order_unplaced_total_auc = EXCLUDED.on_order_unplaced_total_auc,
            written_gm_perc = EXCLUDED.written_gm_perc,
            written_gm_dollar = EXCLUDED.written_gm_dollar,
            eop_units = EXCLUDED.eop_units,
            recomm_receipt_units = EXCLUDED.recomm_receipt_units,
            recomm_receipt_cost = EXCLUDED.recomm_receipt_cost,
            recomm_receipt_auc = EXCLUDED.recomm_receipt_auc,
            scenario = EXCLUDED.scenario,
            actualised = EXCLUDED.actualised,
            revenue = EXCLUDED.revenue,
            discount = EXCLUDED.discount;
            $sql$,
            dept_name_part,
            start_week,
            end_week,
            channels
    );

    RAISE NOTICE 'Generated Query: %',
    main_query;

    EXECUTE main_query;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;

    RETURN rows_inserted;

    EXCEPTION
    WHEN OTHERS THEN GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT,
    error_context = PG_EXCEPTION_CONTEXT;

    RAISE EXCEPTION 'Unexpected error: % Context: %',
    error_message,
    error_context USING ERRCODE = SQLSTATE;

    END;

    EXECUTE format('SET TIME ZONE %L', original_timezone);

    RETURN rows_inserted;

    EXCEPTION
    WHEN OTHERS THEN GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT,
    error_context = PG_EXCEPTION_CONTEXT;

    RAISE EXCEPTION 'Critical error: % Context: %',
    error_message,
    error_context USING ERRCODE = SQLSTATE;

END;
$function$;