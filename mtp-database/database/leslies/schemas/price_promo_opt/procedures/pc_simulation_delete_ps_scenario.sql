--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_delete_ps_scenario runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_delete_ps_scenario

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_delete_ps_scenario ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ps_scenario(IN var_promo_id integer, IN arr_scenario_id integer[], IN edit_mode integer DEFAULT 0, IN var_specific_start_date date DEFAULT NULL::date, IN var_specific_end_date date DEFAULT NULL::date, IN discount_filter_name character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_sql text;
BEGIN
---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------

    IF discount_filter_name IS NOT NULL THEN
        -- Start building dynamic SQL
        v_sql := 'DELETE FROM price_promo.ps_recommended_scenarios
                  WHERE scenario_id = ANY($1)
                  AND (product_id, store_hierarchy) IN (SELECT product_id, store_hierarchy FROM ' || (discount_filter_name) || ')';

        -- Append edit_mode conditions
        IF edit_mode = 1 THEN
            IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN
                v_sql := v_sql || ' AND recommendation_date BETWEEN $2 AND $3';
                RAISE NOTICE 'Executing dynamic SQL: %', v_sql;
                EXECUTE v_sql USING arr_scenario_id, var_specific_start_date, var_specific_end_date;
            ELSE
                v_sql := v_sql || ' AND recommendation_date > CURRENT_DATE';
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
                RAISE NOTICE 'Executing static SQL: DELETE FROM price_promo.ps_recommended_scenarios WHERE scenario_id = ANY(...) AND recommendation_date BETWEEN % AND %', var_specific_start_date, var_specific_end_date;
                DELETE FROM price_promo.ps_recommended_scenarios
                WHERE scenario_id = ANY(arr_scenario_id)
                AND recommendation_date BETWEEN var_specific_start_date AND var_specific_end_date;
            ELSE
                RAISE NOTICE 'Executing static SQL: DELETE FROM price_promo.ps_recommended_scenarios WHERE scenario_id = ANY(...) AND recommendation_date > CURRENT_DATE';
                
				BEGIN
    				 EXECUTE format('TRUNCATE TABLE price_promo.ps_recommended_scenarios_%s', arr_scenario_id[1]);
			    EXCEPTION 
    					WHEN undefined_table THEN
        	           		RAISE NOTICE 'Table does not exist: ps_recommended_scenarios_%', arr_scenario_id[1];
    					WHEN OTHERS THEN
        					RAISE WARNING 'Error truncating table: %', SQLERRM;
			    END;

            END IF;
        ELSE
            RAISE NOTICE 'Executing static SQL: DELETE FROM price_promo.ps_recommended_scenarios WHERE scenario_id = ANY(...)';
            DELETE FROM price_promo.ps_recommended_scenarios
            WHERE scenario_id = ANY(arr_scenario_id);
        END IF;
    END IF;

END;
$procedure$
;
