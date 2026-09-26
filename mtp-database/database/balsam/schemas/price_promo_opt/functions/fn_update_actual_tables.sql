--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_update_actual_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_update_actual_tables

DROP FUNCTION if exists price_promo_opt.fn_update_actual_tables;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_update_actual_tables(var_date date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

-- Purpose – Orchestrates the entire process of updating promotion actual data for a given date
-- 
-- Example – SELECT price_promo_opt.fn_update_actual_tables('2023-01-15');
-- 
-- Other Functions Used:
-- * pc_fetch_products_for_finalized_promos - Identifies products for finalized promotions
-- * pc_add_actuals_data - Processes actual sales data for promotions
-- * pc_add_actuals_agg_data - Aggregates actual data at promotion level
-- * pc_add_actuals_stack_agg_data - Aggregates actual data for stacked promotions
-- * pc_add_promo_reporting_data - Prepares data for promotion reporting
-- * pc_add_product_reporting_data - Prepares data for product reporting
-- * pc_fetch_products_for_finished_promos - Identifies products for finished promotions
-- * pc_add_promo_basket_data - Adds promotion basket data
-- 
-- Tables Used:
-- * Various tables updated by the called procedures
-- 
-- Returns – Returns 1 on successful completion

DECLARE

    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;

BEGIN

    -- Fetch products for finalized promos

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_fetch_products_for_finalized_promos(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_fetch_products_for_finalized_promos: %', duration;



    -- Add actuals data

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_actuals_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_add_actuals_data: %', duration;

Delete from price_promo.ps_recommended_actuals where currency_id is NULL;



    -- Add actuals aggregate data

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_actuals_agg_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_add_actuals_agg_data: %', duration;



   -- Add actuals STACK aggregate data

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_actuals_stack_agg_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_add_actuals_agg_data: %', duration;




   -- Add promo reporting data

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_promo_reporting_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_add_promo_reporting_data: %', duration;


    -- Add product reporting data

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_product_reporting_data(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_add_product_reporting_data: %', duration;




   -- Fetch products for finished promos

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_fetch_products_for_finished_promos(var_date);
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_fetch_products_for_finished_promos: %', duration;


    -- Add promo basket data

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_promo_basket_data();
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_add_promo_basket_data: %', duration;


    -- Add event basket data

    start_time := clock_timestamp();
    CALL price_promo_opt.pc_add_event_basket_data();
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE 'Time taken for pc_add_event_basket_data: %', duration;


    RETURN 1;

END;

$function$



;