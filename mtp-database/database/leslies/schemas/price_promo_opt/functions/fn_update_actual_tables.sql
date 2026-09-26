--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_update_actual_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_update_actual_tables

DROP FUNCTION IF EXISTS price_promo_opt.fn_update_actual_tables ;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_update_actual_tables(var_date date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    overall_start_time TIMESTAMP;
    overall_duration INTERVAL;
BEGIN
    overall_start_time := clock_timestamp();
    RAISE NOTICE '=== STARTING fn_update_actual_tables for date: % ===', var_date;
    
    -- Step 1: Fetch products for finalized promos
    RAISE NOTICE 'Step 1: Starting pc_fetch_products_for_finalized_promos';
    start_time := clock_timestamp();
    CALL price_promo_opt.pc_fetch_products_for_finalized_promos(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Step 1 COMPLETED: pc_fetch_products_for_finalized_promos took: %', duration;

    -- Step 2: Add actuals data
    RAISE NOTICE 'Step 2: Starting pc_add_actuals_data';
    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_actuals_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Step 2 COMPLETED: pc_add_actuals_data took: %', duration;

    -- Step 3: Add actuals aggregate data
    RAISE NOTICE 'Step 3: Starting pc_add_actuals_agg_data';
    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_actuals_agg_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Step 3 COMPLETED: pc_add_actuals_agg_data took: %', duration;

    -- Step 4: Add actuals STACK aggregate data
    RAISE NOTICE 'Step 4: Starting pc_add_actuals_stack_agg_data';
    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_actuals_stack_agg_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Step 4 COMPLETED: pc_add_actuals_stack_agg_data took: %', duration;

    -- Step 5: Add promo reporting data
    RAISE NOTICE 'Step 5: Starting pc_add_promo_reporting_data';
    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_promo_reporting_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Step 5 COMPLETED: pc_add_promo_reporting_data took: %', duration;

    -- Step 6: Add product reporting data
    RAISE NOTICE 'Step 6: Starting pc_add_product_reporting_data';
    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_product_reporting_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Step 6 COMPLETED: pc_add_product_reporting_data took: %', duration;

    -- Step 7: Add promo basket data
    RAISE NOTICE 'Step 7: Starting pc_add_promo_basket_data';
    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_promo_basket_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Step 7 COMPLETED: pc_add_promo_basket_data took: %', duration;

    -- Step 8: Add event basket data
    RAISE NOTICE 'Step 8: Starting pc_add_event_basket_data';
    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_event_basket_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Step 8 COMPLETED: pc_add_event_basket_data took: %', duration;

    -- Calculate overall duration
    end_time := clock_timestamp();
    overall_duration := end_time - overall_start_time;
    RAISE NOTICE '=== fn_update_actual_tables COMPLETED in: % ===', overall_duration;

    RETURN 1;
END;
$function$
;
