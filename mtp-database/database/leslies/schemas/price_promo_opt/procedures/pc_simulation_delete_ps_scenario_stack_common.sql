--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_delete_ps_scenario_stack_common runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_delete_ps_scenario_stack_common

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_delete_ps_scenario_stack_common ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ps_scenario_stack_common(IN var_promo_id integer, IN arr_scenario_id integer[], IN var_discount_filter character varying, IN edit_mode integer DEFAULT 0, IN var_specific_start_date date DEFAULT NULL::date, IN var_specific_end_date date DEFAULT NULL::date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query_1 varchar;

    scenario_table varchar;



BEGIN
---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------

    -- Ensure safe identifier formatting

    scenario_table := format('price_promo.ps_recommended_scenarios_stack_%s', arr_scenario_id[1])::varchar;



	raise notice '%',scenario_table;

	raise notice '%',var_discount_filter;



    IF edit_mode = 1 THEN

        IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN

            query_1 := format(

                'DELETE FROM %s

                WHERE (product_id, store_hierarchy, recommendation_date) IN 

                (SELECT product_id, store_hierarchy, date FROM %s) 

                AND recommendation_date BETWEEN %L AND %L',

                scenario_table, var_discount_filter, var_specific_start_date, var_specific_end_date

            );

        ELSE

            query_1 := format(

                'DELETE FROM %s

                WHERE (product_id, store_hierarchy, recommendation_date) IN 

                (SELECT product_id, store_hierarchy, date FROM %s) 

                AND recommendation_date > CURRENT_DATE',

                scenario_table, var_discount_filter

            );

        END IF;

    ELSE

        IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN

            query_1 := format(

                'DELETE FROM %s

                WHERE (product_id, store_hierarchy, recommendation_date) IN 

                (SELECT product_id, store_hierarchy, date FROM %s) 

                AND recommendation_date BETWEEN %L AND %L',

                scenario_table, var_discount_filter, var_specific_start_date, var_specific_end_date

            );

        ELSE

            query_1 := format(

                'DELETE FROM %s

                WHERE (product_id, store_hierarchy, recommendation_date) IN 

                (SELECT product_id, store_hierarchy, date FROM %s)',

                scenario_table, var_discount_filter

            );

        END IF;

    END IF;



    RAISE NOTICE 'Executing Query: %', query_1;

    EXECUTE query_1;



END;

$procedure$
;
