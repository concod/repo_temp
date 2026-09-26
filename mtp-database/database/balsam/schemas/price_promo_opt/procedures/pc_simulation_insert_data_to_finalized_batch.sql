--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_to_finalized_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_insert_data_to_finalized_batch

DROP PROCEDURE if exists price_promo_opt.pc_simulation_insert_data_to_finalized_batch;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_to_finalized_batch(IN var_promo_id integer, IN table_name_to_insert character varying, IN from_table_to_insert character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



DECLARE



    query varchar;



BEGIN

-- Purpose: Transfers simulated promotion results to a finalized table for reporting and analysis.
-- Example: CALL price_promo_opt.pc_simulation_insert_data_to_finalized_batch(12345, 'price_promo.ps_recommended_finalized', 'price_promo_opt_temp.promo_results_12345_100');
-- Other Functions Used:
--   * No direct function calls within this procedure
-- Tables Used:
--   * Input from_table_to_insert - Source table containing simulation results
--   * Output table_name_to_insert - Target table for finalized data (typically ps_recommended_finalized)
-- Returns: No direct return value; deletes existing data for the specified promotion in the target
--   table and inserts new simulation results, preserving all metrics such as sales, revenue,
--   margin, and contribution data






        -- Construct the query using the date formatted as 'yyyymmdd'



        query := format('



			DELETE from %s where promo_id = %s;



            INSERT INTO %s



            (event_id, promo_id, product_id, recommendation_date, 



			store_hierarchy, customer_id, currency_id,



            discount_level_value, offer_type_id,



            effective_discount,  original_cost, discounted_price,



            promo_spend, sales_units, baseline_sales_units, incremental_sales_units,



             revenue, baseline_revenue, incremental_revenue,



             margin, baseline_margin, incremental_margin,



             affinity_revenue, cannibalization_revenue, pull_forward_revenue,



            affinity_margin, cannibalization_margin, pull_forward_margin,







            created_by, updated_by, created_at, updated_at,



			contribution_margin,



			contribution_revenue, coupon_amount)



            SELECT event_id, promo_id, product_id, recommendation_date,

			store_hierarchy, customer_id, currency_id,



            discount_level_value, offer_type_id,



            effective_discount,  original_cost, discounted_price,



            promo_spend, sales_units, baseline_sales_units, incremental_sales_units,



             revenue, baseline_revenue, incremental_revenue,



             margin, baseline_margin, incremental_margin,



             affinity_revenue, cannibalization_revenue, pull_forward_revenue,



            affinity_margin, cannibalization_margin, pull_forward_margin,







            created_by, updated_by, created_at, updated_at,



			contribution_margin,



			contribution_revenue, coupon_amount



            FROM %s;



        ',



        table_name_to_insert, var_promo_id, table_name_to_insert,



        from_table_to_insert);







        -- Print the query for debugging



        RAISE NOTICE '%', query;







        -- Execute the dynamically constructed query



        EXECUTE query;







END;



$procedure$



;