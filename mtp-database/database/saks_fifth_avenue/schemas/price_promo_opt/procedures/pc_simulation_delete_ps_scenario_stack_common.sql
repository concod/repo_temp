--liquibase formatted sql
--changeset vaibhav@:pc_simulation_delete_ps_scenario_stack_common_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_delete_ps_scenario_stack_common

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_delete_ps_scenario_stack_common;

CREATE OR REPLACE
PROCEDURE price_promo_opt.pc_simulation_delete_ps_scenario_stack_common(IN var_promo_id integer, IN arr_scenario_id integer[], IN var_discount_filter TEXT
,
IN edit_mode integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
query_1 TEXT;

BEGIN
IF edit_mode = 1 THEN
-- Delete existing recommended scenarios for given promo and scenario IDs

query_1 := format('DELETE FROM price_promo.ps_recommended_scenarios_stack_%s

    WHERE (product_id, s0_id, s1_id, recommendation_date) IN (
    SELECT product_id, s0_id, s1_id, date from %s ) and recommendation_date>current_date',
arr_scenario_id[1],
var_discount_filter)
		;
ELSE
    query_1 := format('DELETE FROM price_promo.ps_recommended_scenarios_stack_%s

    WHERE (product_id, s0_id, s1_id, recommendation_date) IN (
    SELECT product_id, s0_id, s1_id, date from %s )',
arr_scenario_id[1],
var_discount_filter)
		;
END IF;

RAISE NOTICE '%s',
query_1;

EXECUTE query_1;
END;

$procedure$
;
