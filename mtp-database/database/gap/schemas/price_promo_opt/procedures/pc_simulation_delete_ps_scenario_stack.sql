--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_delete_ps_scenario_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_delete_ps_scenario_stack

DROP PROCEDURE if exists price_promo_opt.pc_simulation_delete_ps_scenario_stack;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ps_scenario_stack(IN var_promo_id integer, IN arr_scenario_id integer[], IN edit_mode integer DEFAULT 0, IN var_specific_start_date date DEFAULT NULL::date, IN var_specific_end_date date DEFAULT NULL::date, IN discount_filter_name character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    v_sql text;

BEGIN

    IF discount_filter_name IS NOT NULL THEN

        -- Start building dynamic SQL

        v_sql := 'DELETE FROM price_promo.ps_recommended_scenarios_stack

                  WHERE scenario_id = ANY($1)

                  AND (product_id, store_reco_level, customer_reco_level,recommendation_date ) IN (SELECT product_id, store_reco_level, customer_reco_level, date FROM ' || (discount_filter_name) || ')';



        -- Append edit_mode conditions

        IF edit_mode = 1 THEN

            IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN

                v_sql := v_sql || ' AND recommendation_date BETWEEN $2 AND $3';

                RAISE NOTICE 'Executing dynamic SQL: %', v_sql;

                EXECUTE v_sql USING arr_scenario_id, var_specific_start_date, var_specific_end_date;

            ELSE

                v_sql := v_sql || ' AND recommendation_date >= current_date';

                RAISE NOTICE 'Executing dynamic SQL: %', v_sql;

                EXECUTE v_sql USING arr_scenario_id;

            END IF;

        ELSE

            RAISE NOTICE 'Executing dynamic SQL: %', v_sql;

            EXECUTE v_sql USING arr_scenario_id;

        END IF;



    ELSE

        -- Existing Flow without discount_filter_name

        IF edit_mode = 1 THEN

            IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN

                RAISE NOTICE 'Executing static SQL: DELETE FROM price_promo.ps_recommended_scenarios_stack WHERE scenario_id = ANY(...) AND recommendation_date BETWEEN % AND %', var_specific_start_date, var_specific_end_date;

                DELETE FROM price_promo.ps_recommended_scenarios_stack

                WHERE scenario_id = ANY(arr_scenario_id)

                AND recommendation_date BETWEEN var_specific_start_date AND var_specific_end_date;

            ELSE

                RAISE NOTICE 'Executing static SQL: DELETE FROM price_promo.ps_recommended_scenarios_stack WHERE scenario_id = ANY(...) AND recommendation_date >= current_date';

                DELETE FROM price_promo.ps_recommended_scenarios_stack

                WHERE scenario_id = ANY(arr_scenario_id)

                AND recommendation_date >= current_date;

            END IF;

        ELSE

            RAISE NOTICE 'Executing static SQL: DELETE FROM price_promo.ps_recommended_scenarios WHERE scenario_id = ANY(...)';

            DELETE FROM price_promo.ps_recommended_scenarios_stack

            WHERE scenario_id = ANY(arr_scenario_id);

        END IF;

    END IF;



END;

$procedure$
;

