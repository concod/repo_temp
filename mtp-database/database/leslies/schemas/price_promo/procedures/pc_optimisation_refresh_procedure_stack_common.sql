--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_optimisation_refresh_procedure_stack_common_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_optimisation_refresh_procedure_stack_common

DROP PROCEDURE IF EXISTS price_promo.pc_optimisation_refresh_procedure_stack_common;

CREATE OR REPLACE PROCEDURE price_promo.pc_optimisation_refresh_procedure_stack_common(IN var_promo_id integer, IN arr_scenario_id integer[], IN delete_flag_unlogg integer DEFAULT 1)
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

	CALL price_promo_opt.generate_promo_scenario_opt_report_stack_common(discount_filter_name, discount_filter_name_2);

	raise notice '%', 'log_data_5';
	discount_filter_name_3 := format('price_promo_opt_temp.opt_simulation_create_discount_filter_stack_%s_%s_final_common', var_promo_id, array_to_string(arr_scenario_id, '_'));
   	raise notice '%', 'log_data_5';
    -- Delete existing recommended scenarios for given promo and scenario IDs

	call price_promo_opt.pc_simulation_delete_ia_proj_stack_common(var_promo_id, discount_filter_name_3);

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
