--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_optimisation_driver_procedure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_optimisation_driver_procedure

DROP PROCEDURE if exists price_promo_opt.pc_optimisation_driver_procedure;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_optimisation_driver_procedure(IN var_promo_id integer, IN arr_speed_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



DECLARE



    var_start_date date;



    var_end_date date;



    var_week_start_date date;



    var_week_end_date date;



    query varchar;



    discount_filter_name varchar;



    table_suffix varchar;



    



    fetch_promo_details_start TIMESTAMPTZ;



    fetch_promo_details_end TIMESTAMPTZ;



    create_promo_product_filter_start TIMESTAMPTZ;



    create_promo_product_filter_end TIMESTAMPTZ;



    create_discount_filter_start TIMESTAMPTZ;



    create_discount_filter_end TIMESTAMPTZ;



    delete_existing_recommended_scenarios_start TIMESTAMPTZ;



    delete_existing_recommended_scenarios_end TIMESTAMPTZ;



    create_date_partitions_start TIMESTAMPTZ;



    create_date_partitions_end TIMESTAMPTZ;



    fetch_store_data_start TIMESTAMPTZ;



    fetch_store_data_end TIMESTAMPTZ;



    offer_attractiveness_start TIMESTAMPTZ;



    offer_attractiveness_end TIMESTAMPTZ;



    cannibalization_coeff_start TIMESTAMPTZ;



    cannibalization_coeff_end TIMESTAMPTZ;



    pf_coeff_start TIMESTAMPTZ;



    pf_coeff_end TIMESTAMPTZ;



    insert_data_start TIMESTAMPTZ;



    insert_data_end TIMESTAMPTZ;



    refresh_aggregated_scenarios_start TIMESTAMPTZ;



    refresh_aggregated_scenarios_end TIMESTAMPTZ;



    drop_unlogged_tables_start TIMESTAMPTZ;



    drop_unlogged_tables_end TIMESTAMPTZ;



BEGIN



    -- Log the current timestamp



    RAISE NOTICE 'time_1_%', clock_timestamp();



    table_suffix := format('%s_%s', var_promo_id, array_to_string(arr_speed_id, '_'));



    



    -- Fetch promotion details



    fetch_promo_details_start := clock_timestamp();







    SELECT start_date, end_date, week_start_date, week_end_date 



    FROM price_promo_opt.fn_get_promo_details(var_promo_id)



    INTO var_start_date, var_end_date, var_week_start_date, var_week_end_date;







    fetch_promo_details_end := clock_timestamp();







    -- Call procedure to create promo product filter



    create_promo_product_filter_start := clock_timestamp();



    CALL price_promo_opt.pc_simulation_create_promo_product_filter(var_promo_id, arr_speed_id);



    create_promo_product_filter_end := clock_timestamp();







    -- Call procedure to create discount filter



    create_discount_filter_start := clock_timestamp();



    CALL price_promo_opt.pc_opt_pre_create_discount_filter(



        var_promo_id, arr_speed_id);



    create_discount_filter_end := clock_timestamp();







   -- Discount_filter name



    discount_filter_name := format('price_promo_opt_temp.promo_opt_pre_discount_filter_%s', table_suffix);



   



    -- Fetch store level data



    fetch_store_data_start := clock_timestamp();



    CALL price_promo_opt.pc_simulation_fetch_store_level_data(var_promo_id, var_week_start_date, var_week_end_date, arr_speed_id);



    fetch_store_data_end := clock_timestamp();







    -- Calculate offer attractiveness factor



    offer_attractiveness_start := clock_timestamp();



    CALL price_promo_opt.pc_simulation_offer_attractiveness_factor(discount_filter_name, var_promo_id, arr_speed_id);



    offer_attractiveness_end := clock_timestamp();







    -- Calculate cannibalization coefficient



    cannibalization_coeff_start := clock_timestamp();



    CALL price_promo_opt.pc_simulation_cannibalization_coefficient(var_promo_id, discount_filter_name, var_start_date, var_end_date, arr_speed_id);



    cannibalization_coeff_end := clock_timestamp();







    -- Calculate pull-forward coefficient



    pf_coeff_start := clock_timestamp();



    CALL price_promo_opt.pc_simulation_pf_coefficient(var_promo_id, discount_filter_name, var_end_date, arr_speed_id);



    pf_coeff_end := clock_timestamp();







    -- Construct the query for inserting data into ps_recommended_scenarios



 



    -- Start timing for data insertion



    insert_data_start := clock_timestamp();



    -- Print the query



	call price_promo_opt.pc_opt_pre_simulation_create_gurobi_data(

											var_promo_id, arr_speed_id, var_week_start_date, var_week_end_date,

											var_start_date, var_end_date, table_suffix);





    insert_data_end := clock_timestamp();











    -- Start timing for dropping unlogged tables



    drop_unlogged_tables_start := clock_timestamp();







    drop_unlogged_tables_end := clock_timestamp();











    -- Insert timing information into the speed_tracing_simulate table



    INSERT INTO price_promo_opt.speed_tracing_simulate



    (promo_id, scenario_id, fetch_promo_details_start, fetch_promo_details_end, 



     create_promo_product_filter_start, create_promo_product_filter_end,



     create_discount_filter_start, create_discount_filter_end, 



     delete_existing_recommended_scenarios_start, delete_existing_recommended_scenarios_end, 



     create_date_partitions_start, create_date_partitions_end, 



     fetch_store_data_start, fetch_store_data_end,



     offer_attractiveness_start, offer_attractiveness_end,



     cannibalization_coeff_start, cannibalization_coeff_end,



     pf_coeff_start, pf_coeff_end,



     insert_data_start, insert_data_end, 



     refresh_aggregated_scenarios_start, refresh_aggregated_scenarios_end, 



     drop_unlogged_tables_start, drop_unlogged_tables_end)



    VALUES



    (var_promo_id, arr_speed_id, fetch_promo_details_start, fetch_promo_details_end, 



     create_promo_product_filter_start, create_promo_product_filter_end,



     create_discount_filter_start, create_discount_filter_end, 



     delete_existing_recommended_scenarios_start, delete_existing_recommended_scenarios_end, 



     create_date_partitions_start, create_date_partitions_end, 



     fetch_store_data_start, fetch_store_data_end,



     offer_attractiveness_start, offer_attractiveness_end,



     cannibalization_coeff_start, cannibalization_coeff_end,



     pf_coeff_start, pf_coeff_end,



     insert_data_start, insert_data_end, 



     refresh_aggregated_scenarios_start, refresh_aggregated_scenarios_end, 



     drop_unlogged_tables_start, drop_unlogged_tables_end);







END;



$procedure$



;