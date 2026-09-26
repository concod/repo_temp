--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_to_scenarios_override_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_insert_data_to_scenarios_override_batch

DROP PROCEDURE if exists price_promo_opt.pc_simulation_insert_data_to_scenarios_override_batch;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_to_scenarios_override_batch(IN arr_promo_id integer[], IN table_name_to_insert character varying, IN from_table_to_insert character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

    scenario_id RECORD;



BEGIN


-- Purpose: Transfers simulation results to scenario-specific tables with selective overriding.
-- Example: CALL price_promo_opt.pc_simulation_insert_data_to_scenarios_override_batch(ARRAY[12345, 12346], 'price_promo.ps_scenario_results', 'price_promo_opt_temp.promo_results_12345_100');
-- Other Functions Used:
--   * No direct function calls within this procedure
-- Tables Used:
--   * Input from_table_to_insert - Source table containing simulation results with scenario_id
--   * Output [table_name_to_insert]_[scenario_id] - Scenario-specific target tables for results
-- Returns: No direct return value; processes each distinct scenario_id from the source table,
--   deletes existing data in corresponding scenario tables where product, store, customer, and date
--   combinations match, then inserts new simulation results for that scenario with all metrics



    -- Dynamically fetch distinct scenario_ids

    FOR scenario_id IN

        EXECUTE format('SELECT DISTINCT scenario_id FROM %s', from_table_to_insert)

    LOOP

        -- Construct the query using the specific scenario_id

        query := format('

            DELETE FROM %s_%s

            WHERE (product_id, currency_id,store_hierarchy, customer_id, recommendation_date) IN (

                SELECT DISTINCT product_id, currency_id,store_hierarchy, customer_id, recommendation_date

                FROM %s

                WHERE scenario_id = %L

            );

            INSERT INTO %s_%s

            (event_id, promo_id, product_id, currency_id,scenario_id, recommendation_date, store_hierarchy, customer_id, discount_level_value, offer_type_id,

             effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,

             incremental_sales_units, revenue, baseline_revenue, incremental_revenue,

             margin, baseline_margin, incremental_margin, affinity_revenue, cannibalization_revenue, pull_forward_revenue,

             affinity_margin, cannibalization_margin, pull_forward_margin, created_by, updated_by, created_at, updated_at, contribution_revenue,

             contribution_margin, coupon_amount)

            SELECT event_id, promo_id, product_id, currency_id,scenario_id, recommendation_date, store_hierarchy, customer_id, discount_level_value, offer_type_id,

                   effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,

                   incremental_sales_units, revenue, baseline_revenue, incremental_revenue,

                   margin, baseline_margin, incremental_margin, affinity_revenue, cannibalization_revenue, pull_forward_revenue,

                   affinity_margin, cannibalization_margin, pull_forward_margin, created_by, updated_by::integer, created_at, updated_at, contribution_revenue,

                   contribution_margin, coupon_amount

            FROM %s

            WHERE scenario_id = %L;

        ',

        table_name_to_insert, scenario_id.scenario_id,

        from_table_to_insert, scenario_id.scenario_id,

        table_name_to_insert, scenario_id.scenario_id,

        from_table_to_insert, scenario_id.scenario_id);



        -- Print the query for debugging

        RAISE NOTICE '%', query;



        -- Execute the dynamically constructed query

        EXECUTE query;

    END LOOP;

END;



$procedure$



;