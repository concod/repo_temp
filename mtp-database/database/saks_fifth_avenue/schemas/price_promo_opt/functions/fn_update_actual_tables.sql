--liquibase formatted sql
--changeset liquibase:fn_update_actual_tables_v261124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_update_actual_tables_v2.1

DROP FUNCTION IF EXISTS price_promo_opt.fn_update_actual_tables;

CREATE OR REPLACE FUNCTION price_promo_opt.fn_update_actual_tables(var_date date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

    RETURN 1;
END;
$function$
;
