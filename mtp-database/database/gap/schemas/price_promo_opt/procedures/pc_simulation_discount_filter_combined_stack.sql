--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_discount_filter_combined_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_discount_filter_combined_stack

DROP PROCEDURE if exists price_promo_opt.pc_simulation_discount_filter_combined_stack;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_discount_filter_combined_stack(IN var_promo_id integer, IN arr_scenario_id integer[])
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

	discount_filter_name_2 varchar;

	discount_filter_name_3 varchar;

    table_suffix varchar;





BEGIN



    table_suffix := format('%s_%s', var_promo_id, array_to_string(arr_scenario_id, '_'));

	raise notice '%', 'log_data_1';

    SELECT start_date, end_date, week_start_date, week_end_date

    FROM price_promo_opt.fn_get_promo_details(var_promo_id)

    INTO var_start_date, var_end_date, var_week_start_date, var_week_end_date;

	raise notice '%', 'log_data_2';

    discount_filter_name := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s', var_promo_id, array_to_string(arr_scenario_id, '_'));

   	CALL price_promo_opt.pc_simulation_create_discount_filter_date_stack(var_promo_id,1,1);

	raise notice '%', 'log_data_4.0';

	CALL price_promo_opt.pc_simulation_create_discount_filter_finalized_stack(var_promo_id,ARRAY[arr_scenario_id]);

	raise notice '%', 'log_data_4';

	discount_filter_name_2 := format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));

   	raise notice '%',discount_filter_name_2;

	CALL price_promo_opt.generate_promo_scenario_report_stack(discount_filter_name, discount_filter_name_2);

	raise notice '%', 'log_data_5';

	discount_filter_name_3 := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s_final', var_promo_id, array_to_string(arr_scenario_id, '_'));

   	raise notice '%', 'log_data_5';



END;

$procedure$
;

