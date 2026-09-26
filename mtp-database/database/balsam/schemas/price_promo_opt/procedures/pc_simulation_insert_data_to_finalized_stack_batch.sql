--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_to_finalized_stack_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_insert_data_to_finalized_stack_batch

DROP PROCEDURE if exists price_promo_opt.pc_simulation_insert_data_to_finalized_stack_batch;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_to_finalized_stack_batch(IN arr_promo_id integer[], IN table_name_to_insert character varying, IN from_table_to_insert character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;



BEGIN


-- Purpose: Transfers stacked simulation results to a finalized table for multiple promotions.
-- Example: CALL price_promo_opt.pc_simulation_insert_data_to_finalized_stack_batch(ARRAY[12345, 12346], 'price_promo.ps_recommended_finalized_stack', 'price_promo_opt_temp.promo_results_stacked_12345_12346');
-- Other Functions Used:
--   * No direct function calls within this procedure
-- Tables Used:
--   * Input from_table_to_insert - Source table containing stacked simulation results
--   * Output table_name_to_insert - Target table for finalized stacked data
-- Returns: No direct return value; deletes existing data where promotion IDs arrays overlap with
--   the input array for matching product, store, customer, and date combinations, then inserts
--   stacked simulation results including POS baseline data and all metrics



-- Construct the query using the date formatted as 'yyyymmdd'

query := format('

			delete from %s where promo_ids && %L and (product_id, store_hierarchy, customer_id, recommendation_date) in

			(select distinct product_id, store_hierarchy, customer_id,recommendation_date from %s) ;

            INSERT INTO %s

            (event_id, promo_ids, product_id, recommendation_date, store_hierarchy, customer_id, currency_id, discount_level_value, offer_type_id,

			effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,

			pos_baseline_sales_units, incremental_sales_units,  revenue, baseline_revenue, pos_baseline_revenue, incremental_revenue,

			margin, baseline_margin, pos_baseline_margin, incremental_margin,  affinity_revenue, cannibalization_revenue, pull_forward_revenue,

			affinity_margin, cannibalization_margin, pull_forward_margin,  created_by, updated_by, created_at, updated_at, contribution_revenue,

			contribution_margin, coupon_amount

)

            SELECT event_id, promo_ids, product_id, recommendation_date, store_hierarchy, customer_id, currency_id, discount_level_value, offer_type_id,

			effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,

			pos_baseline_sales_units, incremental_sales_units,  revenue, baseline_revenue, pos_baseline_revenue, incremental_revenue,

			margin, baseline_margin, pos_baseline_margin, incremental_margin,  affinity_revenue, cannibalization_revenue, pull_forward_revenue,

			affinity_margin, cannibalization_margin, pull_forward_margin,  created_by, updated_by, created_at, updated_at, contribution_revenue,

			contribution_margin, coupon_amount

            FROM %s;

        ',

       table_name_to_insert,arr_promo_id, from_table_to_insert,

table_name_to_insert,

        from_table_to_insert);

-- Print the query for debugging

        RAISE NOTICE '%',

query;

-- Execute the dynamically constructed query

        EXECUTE query;

END;



$procedure$



;