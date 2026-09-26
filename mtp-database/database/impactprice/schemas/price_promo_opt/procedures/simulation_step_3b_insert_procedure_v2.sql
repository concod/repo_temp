--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:simulation_step_3b_insert_procedure_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for simulation_step_3b_insert_procedure_v2

DROP PROCEDURE if exists price_promo_opt.simulation_step_3b_insert_procedure_v2;
CREATE OR REPLACE PROCEDURE price_promo_opt.simulation_step_3b_insert_procedure_v2(IN var_promo_id integer, IN var_scenario_id integer, IN var_simulation_date date, IN var_is_stacked boolean DEFAULT false, IN var_target_normal_prefix text DEFAULT 'ps_recommended_scenarios'::text, IN var_target_stack_prefix text DEFAULT 'ps_recommended_scenarios_stack'::text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    query text;
    date_str text := to_char(var_simulation_date, 'YYYYMMDD');
    table_suffix text := format('%s_%s', var_promo_id, var_scenario_id);
    table_3b text;
    table_ps_rec text;
    v_row_count bigint;
	second_part text;
	to_date date;
BEGIN
--      	PERFORM set_config('synchronous_commit','off', true);
--   		PERFORM set_config('jit', 'off', true);

    -- Disable JIT for this transaction
    SET LOCAL jit = off;

    -- disable WAL flush per transaction
    SET LOCAL synchronous_commit = OFF;

    -- defer constraint checks
    SET CONSTRAINTS ALL DEFERRED;

    -- Build 3B source table name (must match Step 3 naming)
    IF var_is_stacked THEN
        table_3b := format('simulation_flow_3b_stk_%s_%s', table_suffix, date_str);
        table_ps_rec := format('%s_%s_%s', var_target_stack_prefix, var_scenario_id, date_str);
		second_part:= format('%s_%s', var_target_stack_prefix, var_scenario_id);
    ELSE
        table_3b := format('simulation_flow_3b_%s_%s', table_suffix, date_str);
        table_ps_rec := format('%s_%s_%s', var_target_normal_prefix, var_scenario_id, date_str);
		second_part:= format('%s_%s', var_target_normal_prefix, var_scenario_id);
    END IF;

    RAISE NOTICE 'Step3B INSERT: source=price_promo_opt_temp.%, target=price_promo.%, stacked=%', table_3b, table_ps_rec, var_is_stacked;
	
	to_date:= var_simulation_date + INTERVAL '1 day';
	query :=' ALTER TABLE price_promo.'||second_part||' ATTACH PARTITION price_promo.'|| table_ps_rec ||
			' FOR VALUES FROM ('''||var_simulation_date||''' ) TO ( '''||to_date||''') ;' ;
			
	raise notice '_sql: %', query;
    EXECUTE query;

--CALL public.sync_xxx(query, 'price_promo_opt_temp.' || table_3b, 'product_id', 1000, 50);
--    GET DIAGNOSTICS v_row_count = ROW_COUNT;
--    RAISE NOTICE 'Step3B INSERT: % rows inserted into price_promo.% (stacked=%)', v_row_count, table_ps_rec, var_is_stacked;

END;
$procedure$
;
