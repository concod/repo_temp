--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_main_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_ps_breakdown_main_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_ps_breakdown_main;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_ps_breakdown_main(IN strategy_id integer, IN product_hierarchy_string text, IN start_date date, IN end_date date, IN channel_id text, IN segment_id text, IN comparison_column_1 text, IN comparison_value_1 text, IN comparison_column_2 text, IN comparison_value_2 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    zone_row_count integer;
	filter_table_name text;
	safe_comparison_value text;
BEGIN
    start_time := clock_timestamp();

    RAISE NOTICE 'STARTING STRATEGY PRODUCT STORE BREAKDOWN Calculation for Strategy - : %', strategy_id;
	safe_comparison_value := regexp_replace(comparison_value_1, '[^a-zA-Z0-9]', '_', 'g');

    -- Build filter table name exactly as created by sp_strategy_ps_breakdown_filter
    filter_table_name := format(
        'base_pricing_restaurant.temp_strategy_ps_breakdown_filter_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        safe_comparison_value,
        user_id
    );
    -- STEP 1: Create Filter table
    CALL base_pricing_restaurant.sp_strategy_ps_breakdown_filter(
        strategy_id,
        channel_id,
        segment_id,
        comparison_column_1,
        comparison_value_1,
        comparison_column_2,
        comparison_value_2,
        user_id
    );

    -- STEP 2: Weighted Store Sales (DIRECT)
    CALL base_pricing_restaurant.sp_strategy_ps_breakdown_weighted_store_sales_direct(
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    -- STEP 3: Remove NON-AGGREGATED rows
    CALL base_pricing_restaurant.sp_strategy_ps_breakdown_filter_update(
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    -- CHECK row count
    EXECUTE format(
        'SELECT COUNT(*) FROM %s',
        filter_table_name
    ) INTO zone_row_count;


    -- SKIP if nothing qualifies
    IF comparison_column_2 = 'price_zone_name' AND zone_row_count > 0 THEN

        -- STEP 4: Aggregate Sales Data
        CALL base_pricing_restaurant.sp_strategy_ps_breakdown_agg_sales_data(
            strategy_id,
            comparison_column_1,
            comparison_value_1,
            user_id
        );

        -- STEP 5.1: Filter Split (NON-KVI)
        CALL base_pricing_restaurant.sp_strategy_ps_breakdown_filter_split(
            strategy_id,
            'false',
            comparison_column_1,
            comparison_value_1,
            user_id
        );

        -- STEP 5.2: Filter Split (KVI)
        CALL base_pricing_restaurant.sp_strategy_ps_breakdown_filter_split(
            strategy_id,
            'true',
            comparison_column_1,
            comparison_value_1,
            user_id
        );

        -- STEP 6: Store Split Data
        CALL base_pricing_restaurant.sp_strategy_ps_breakdown_store_split_data(
            strategy_id,
            product_hierarchy_string,
            start_date,
            end_date,
            channel_id,
            segment_id,
            comparison_column_1,
            comparison_value_1,
            user_id
        );

        -- STEP 7: Weighted Store Sales (UPDATED)
        CALL base_pricing_restaurant.sp_strategy_ps_breakdown_weighted_store_sales(
            strategy_id,
            channel_id,
            segment_id,
            comparison_column_1,
            comparison_value_1,
            user_id
        );
    END IF;

    RAISE NOTICE 'FINISHED STRATEGY PRODUCT STORE BREAKDOWN Calculation for Strategy - : %', strategy_id;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken : %', end_time - start_time;

    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
    (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
    (strategy_id, 'sp_strategy_ps_breakdown_main', start_time, end_time, end_time - start_time);

END;
$procedure$
;