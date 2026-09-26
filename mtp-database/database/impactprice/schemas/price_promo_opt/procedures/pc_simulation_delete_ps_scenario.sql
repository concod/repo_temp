--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_delete_ps_scenario runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_delete_ps_scenario

DROP PROCEDURE if exists price_promo_opt.pc_simulation_delete_ps_scenario;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ps_scenario(IN var_promo_id integer, IN arr_scenario_id integer[], IN edit_mode integer DEFAULT 0, IN var_specific_start_date date DEFAULT NULL::date, IN var_specific_end_date date DEFAULT NULL::date, IN discount_filter_name character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_sql text;
    var_promo_start_date date;
    var_promo_end_date date;
    rec record;
    i integer;
BEGIN

    -- Fetch promo start and end date from promo_master
    SELECT start_date, end_date
    INTO var_promo_start_date, var_promo_end_date
    FROM price_promo.promo_master
    WHERE promo_id = var_promo_id;

    RAISE NOTICE 'pc_simulation_delete_ps_scenario: promo_id=%, promo_start=%, promo_end=%, current_date=%, specific_start=%, specific_end=%, edit_mode=%',
        var_promo_id, var_promo_start_date, var_promo_end_date, current_date, var_specific_start_date, var_specific_end_date, edit_mode;

    -- ══ FAST PATH: If specific dates are NULL and promo start_date > current_date,
    --    the entire promo is in the future → truncate partition tables (much faster than DELETE)
    IF var_specific_start_date IS NULL
       AND var_specific_end_date IS NULL
       AND var_promo_start_date > current_date
    THEN
        RAISE NOTICE 'FAST PATH: promo start_date (%) > current_date (%), truncating partition tables for scenario_ids=%',
            var_promo_start_date, current_date, arr_scenario_id;

        FOR i IN 1..array_length(arr_scenario_id, 1) LOOP
            FOR rec IN
                SELECT schemaname, tablename
                FROM pg_tables
                WHERE schemaname = 'price_promo'
                  AND tablename LIKE 'ps_recommended_scenarios_' || arr_scenario_id[i] || '_%'
            LOOP
                v_sql := format('TRUNCATE TABLE %I.%I', rec.schemaname, rec.tablename);
                RAISE NOTICE 'Truncating: %', v_sql;
                EXECUTE v_sql;
            END LOOP;
        END LOOP;

        RAISE NOTICE 'FAST PATH: truncate complete for promo_id=%', var_promo_id;
        RETURN;
    END IF;

    -- ══ STANDARD PATH (original logic) ══════════════════════════════════
    IF discount_filter_name IS NOT NULL THEN
        -- Start building dynamic SQL
        v_sql := 'DELETE FROM price_promo.ps_recommended_scenarios
                  WHERE scenario_id = ANY($1)
                  AND (product_id, store_reco_level, customer_reco_level) IN (SELECT product_id, store_reco_level, customer_reco_level FROM ' || (discount_filter_name) || ')';

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
                RAISE NOTICE 'Executing static SQL: DELETE FROM price_promo.ps_recommended_scenarios WHERE scenario_id = ANY(...) AND recommendation_date BETWEEN % AND %', var_specific_start_date, var_specific_end_date;
                DELETE FROM price_promo.ps_recommended_scenarios
                WHERE scenario_id = ANY(arr_scenario_id)
                AND recommendation_date BETWEEN var_specific_start_date AND var_specific_end_date;
            ELSE
                RAISE NOTICE 'Executing static SQL: DELETE FROM price_promo.ps_recommended_scenarios WHERE scenario_id = ANY(...) AND recommendation_date >= current_date';
                DELETE FROM price_promo.ps_recommended_scenarios
                WHERE scenario_id = ANY(arr_scenario_id)
                AND recommendation_date >= current_date;
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
