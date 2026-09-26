--liquibase formatted sql
--changeset bingimalla.divyasree@impactanalytics.co:pc_simulation_insert_data_to_finalized_override_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_insert_data_to_finalized_override_batch

DROP PROCEDURE if exists price_promo_opt.pc_simulation_insert_data_to_finalized_override_batch;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_to_finalized_override_batch(IN arr_promo_id integer[], IN table_name_to_insert character varying, IN from_table_to_insert character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

	row_count bigint;

BEGIN

-- Purpose: Transfers simulation results to a finalized table for multiple promotions with overlapping data.
-- Example: CALL price_promo_opt.pc_simulation_insert_data_to_finalized_override_batch(ARRAY[12345, 12346], 'price_promo.ps_recommended_finalized', 'price_promo_opt_temp.promo_results_12345_100');
-- Other Functions Used:
--   * No direct function calls within this procedure
-- Tables Used:
--   * Input from_table_to_insert - Source table containing simulation results
--   * Output table_name_to_insert - Target table for finalized data (typically ps_recommended_finalized)
-- Returns: No direct return value; selectively deletes existing data for specified promotions where
--   there's overlapping product, store, customer, and date combinations, then inserts new simulation
--   results with all metrics preserved

EXECUTE format('SELECT COUNT(*) FROM %s', from_table_to_insert) INTO row_count;

    -- If no rows, skip delete/insert
    IF row_count = 0 THEN
        RAISE NOTICE 'Source table % has 0 rows. Skipping insert.', from_table_to_insert;
        RETURN;
    END IF;

-- Construct the query using the date formatted as 'yyyymmdd'

query := format('

			delete from %s where promo_id =  any(%L) and (product_id, store_reco_level, customer_reco_level, recommendation_date) in

			(select distinct product_id, store_reco_level, customer_reco_level,recommendation_date from %s) ;

            INSERT INTO %s

            (event_id, promo_id, product_id, recommendation_date, store_reco_level, customer_reco_level, currency_id, discount_level_value, offer_type_id,

			 effective_discount,  original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,

			incremental_sales_units, revenue, baseline_revenue, incremental_revenue,

			margin, baseline_margin, incremental_margin,   affinity_revenue, cannibalization_revenue, pull_forward_revenue,

			affinity_margin, cannibalization_margin, pull_forward_margin,  created_by, updated_by, created_at, updated_at, contribution_revenue,

			contribution_margin, coupon_spend

)

            SELECT event_id, promo_id, product_id, recommendation_date, store_reco_level, customer_reco_level, currency_id, discount_level_value, offer_type_id,

			 effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,

			incremental_sales_units, revenue, baseline_revenue, incremental_revenue,

			margin, baseline_margin, incremental_margin,   affinity_revenue, cannibalization_revenue, pull_forward_revenue,

			affinity_margin, cannibalization_margin, pull_forward_margin,  created_by, updated_by::integer, created_at, updated_at, contribution_revenue,

			contribution_margin, coupon_spend

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