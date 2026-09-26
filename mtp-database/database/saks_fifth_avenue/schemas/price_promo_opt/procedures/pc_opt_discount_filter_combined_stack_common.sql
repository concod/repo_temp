--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_discount_filter_combined_stack_common_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_discount_filter_combined_stack_common.2

DROP PROCEDURE IF EXISTS pc_opt_discount_filter_combined_stack_common;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_discount_filter_combined_stack_common(IN var_promo_id integer, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

    query TEXT;
    discount_filter_name TEXT;
	discount_filter_name_2 TEXT;
	discount_filter_name_3 TEXT;
    table_suffix TEXT;


BEGIN

    table_suffix := format('%s_%s', var_promo_id, array_to_string(arr_scenario_id, '_'));

	discount_filter_name := format('price_promo_opt_temp.opt_simulation_create_discount_filter_stack_%s_%s', var_promo_id, array_to_string(arr_scenario_id, '_'));
   	CALL price_promo_opt.pc_opt_simulation_create_discount_filter_stack(var_promo_id, ARRAY[arr_scenario_id]);

	CALL price_promo_opt.pc_opt_create_discount_filter_finalized_stack(var_promo_id,ARRAY[arr_scenario_id]);

	discount_filter_name_2 := format('price_promo_opt_temp.opt_stacked_discounts_table_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));


	CALL price_promo_opt.generate_promo_scenario_opt_report_stack_common(discount_filter_name, discount_filter_name_2);


	discount_filter_name_3 := format('price_promo_opt_temp.opt_simulation_create_discount_filter_stack_%s_%s_final_common', var_promo_id, array_to_string(arr_scenario_id, '_'));


END;
$procedure$
;
