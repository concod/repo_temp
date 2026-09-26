--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_to_scenarios_override_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_insert_data_to_scenarios_override_batch

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_insert_data_to_scenarios_override_batch;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_to_scenarios_override_batch(IN arr_promo_id integer[], IN table_name_to_insert text, IN from_table_to_insert text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query TEXT;
    scenario_id RECORD;

BEGIN
    -- Dynamically fetch distinct scenario_ids
    FOR scenario_id IN
        EXECUTE format('SELECT DISTINCT scenario_id FROM %s', from_table_to_insert)
    LOOP
        -- Construct the query using the specific scenario_id
        query := format('
            DELETE FROM %s_%s
            WHERE (product_id, s0_id, s1_id, recommendation_date) IN (
                SELECT DISTINCT product_id, s0_id, s1_id, recommendation_date
                FROM %s
                WHERE scenario_id = %L
            );
            INSERT INTO %s_%s
            (event_id, promo_id, product_id, scenario_id, recommendation_date, s0_id, s1_id, discount_level_value, offer_type_id,
             effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,
             incremental_sales_units, revenue, baseline_revenue, incremental_revenue,
             margin, baseline_margin, incremental_margin, affinity_revenue, cannibalization_revenue, pull_forward_revenue,
             affinity_margin, cannibalization_margin, pull_forward_margin, created_by, updated_by, created_at, updated_at, contribution_revenue,
             contribution_margin)
            SELECT event_id, promo_id, product_id, scenario_id, recommendation_date, s0_id, s1_id, discount_level_value, offer_type_id,
                   effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,
                   incremental_sales_units, revenue, baseline_revenue, incremental_revenue,
                   margin, baseline_margin, incremental_margin, affinity_revenue, cannibalization_revenue, pull_forward_revenue,
                   affinity_margin, cannibalization_margin, pull_forward_margin, created_by, updated_by::integer, created_at, updated_at, contribution_revenue,
                   contribution_margin
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
