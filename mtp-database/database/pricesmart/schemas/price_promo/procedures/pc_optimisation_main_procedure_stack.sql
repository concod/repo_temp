--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_optimisation_main_procedure_stack_24052025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_optimisation_main_procedure_stack

-- Purpose: Executes the main optimization procedure for stacked promotions, handling data preparation, simulation, and aggregation
--
-- Example:
-- CALL price_promo.pc_optimisation_main_procedure_stack(123, ARRAY[1,2,3]);
--
-- Other Functions or procedures Used:
-- * pc_simulation_create_promo_product_filter - Creates product filters for simulation
-- * pc_opt_simulation_create_discount_filter_stack - Creates discount filters for stacked promotions
-- * pc_opt_create_discount_filter_finalized_stack - Creates finalized discount filters
-- * generate_promo_scenario_opt_report_stack - Generates optimization reports
-- * pc_simulation_delete_ia_proj_stack - Deletes existing projections
-- * pc_simulation_create_column_day_partitions - Creates date-based partitions
-- * pc_simulation_fetch_store_level_data - Fetches store-level data
-- * pc_simulation_offer_attractiveness_factor - Calculates offer attractiveness
-- * pc_simulation_cannibalization_coefficient_stack - Calculates cannibalization effects
-- * pc_simulation_pf_coefficient_stack - Calculates pull-forward effects
-- * pc_simulation_insert_data_batch_stack - Inserts processed data
--
-- Tables Used:
-- * promo_master - Reads promotion details
-- * ps_recommended_stack_ia - Writes optimized recommendations
-- * Various temporary tables for intermediate calculations
--
-- Returns:
-- void - Processes and stores optimized promotion data with stacked effects

DROP PROCEDURE IF EXISTS pc_optimisation_main_procedure_stack;

CREATE OR REPLACE PROCEDURE price_promo.pc_optimisation_main_procedure_stack(IN var_promo_id integer, IN arr_scenario_id integer[], IN delete_flag_unlogg integer DEFAULT 1)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	var_start_date date;
    var_end_date date;
    var_week_start_date date;
    var_week_end_date date;
    query TEXT;
    discount_filter_name TEXT;
	discount_filter_name_2 TEXT;
	discount_filter_name_3 TEXT;
    table_suffix TEXT;


BEGIN

    table_suffix := format('%s_%s', var_promo_id, array_to_string(arr_scenario_id, '_'));
	raise notice '%', 'log_data_1';
    SELECT start_date, end_date, week_start_date, week_end_date
    FROM price_promo_opt.fn_get_promo_details(var_promo_id)
    INTO var_start_date, var_end_date, var_week_start_date, var_week_end_date;
	raise notice '%', 'log_data_2';

    CALL price_promo_opt.pc_simulation_create_promo_product_filter(var_promo_id, arr_scenario_id);
    raise notice '%', 'log_data_3';
    discount_filter_name := format('price_promo_opt_temp.opt_simulation_create_discount_filter_stack_%s_%s', var_promo_id, array_to_string(arr_scenario_id, '_'));
   	CALL price_promo_opt.pc_opt_simulation_create_discount_filter_stack(var_promo_id, ARRAY[arr_scenario_id]);
	raise notice '%', 'log_data_4.0';
	CALL price_promo_opt.pc_opt_create_discount_filter_finalized_stack(var_promo_id,ARRAY[arr_scenario_id]);
	raise notice '%', 'log_data_4';


	discount_filter_name_2 := format('price_promo_opt_temp.opt_stacked_discounts_table_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));
   	raise notice '%',discount_filter_name_2;

	CALL price_promo_opt.generate_promo_scenario_opt_report_stack(discount_filter_name, discount_filter_name_2);

	raise notice '%', 'log_data_5';
	discount_filter_name_3 := format('price_promo_opt_temp.opt_simulation_create_discount_filter_stack_%s_%s_final', var_promo_id, array_to_string(arr_scenario_id, '_'));
   	raise notice '%', 'log_data_5';
    -- Delete existing recommended scenarios for given promo and scenario IDs

	call price_promo_opt.pc_simulation_delete_ia_proj_stack(var_promo_id);

	raise notice '%', 'log_data_7';

	CALL price_promo_opt.pc_simulation_create_column_day_partitions(
            'price_promo.ps_recommended_stack_ia', array[var_promo_id], var_start_date, var_end_date);
	raise notice '%', 'log_data_8';

    CALL price_promo_opt.pc_simulation_fetch_store_level_data(var_promo_id, var_week_start_date, var_week_end_date, arr_scenario_id);
	raise notice '%', 'log_data_9';

    CALL price_promo_opt.pc_simulation_offer_attractiveness_factor(discount_filter_name_3, var_promo_id, arr_scenario_id);

	raise notice '%', 'log_data_10';

    CALL price_promo_opt.pc_simulation_cannibalization_coefficient_stack(var_promo_id, discount_filter_name_3, var_start_date, var_end_date, arr_scenario_id);

	raise notice '%', 'log_data_11';

    CALL price_promo_opt.pc_simulation_pf_coefficient_stack(var_promo_id, discount_filter_name_3, var_end_date, arr_scenario_id);

	raise notice '%', 'log_data_12';

	call price_promo_opt.pc_simulation_insert_data_batch_stack( var_promo_id, arr_scenario_id,
																				 var_start_date ,  var_week_start_date ,
																				 var_week_start_date , var_week_end_date,
																					var_start_date , var_end_date ,
																				'price_promo.ps_recommended_stack_ia', table_suffix, discount_filter_name_3);
	raise notice '%', 'log_data_13';

	--PERFORM price_promo.refresh_ps_recommended_scenarios_stack_agg_stack(arr_scenario_id);
END;
$procedure$
;
