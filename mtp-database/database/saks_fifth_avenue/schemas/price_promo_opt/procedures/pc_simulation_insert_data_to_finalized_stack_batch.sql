--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_insert_data_to_finalized_stack_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_insert_data_to_finalized_stack_batch

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_insert_data_to_finalized_stack_batch;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_insert_data_to_finalized_stack_batch(IN arr_promo_id integer[], IN table_name_to_insert text, IN from_table_to_insert text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query TEXT;

BEGIN
-- Construct the query using the date formatted as 'yyyymmdd'
query := format('
			delete from %s where promo_ids && %L and (product_id, s0_id, s1_id, recommendation_date) in
			(select distinct product_id, s0_id, s1_id,recommendation_date from %s) ;
            INSERT INTO %s
            (event_id, promo_ids, product_id, recommendation_date, s0_id, s1_id, discount_level_value, offer_type_id,
			effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,
			pos_baseline_sales_units, incremental_sales_units,  revenue, baseline_revenue, pos_baseline_revenue, incremental_revenue,
			margin, baseline_margin, pos_baseline_margin, incremental_margin,  affinity_revenue, cannibalization_revenue, pull_forward_revenue,
			affinity_margin, cannibalization_margin, pull_forward_margin,  created_by, updated_by, created_at, updated_at, contribution_revenue,
			contribution_margin
)
            SELECT event_id, promo_ids, product_id, recommendation_date, s0_id, s1_id, discount_level_value, offer_type_id,
			effective_discount, original_cost, discounted_price, promo_spend, sales_units, baseline_sales_units,
			pos_baseline_sales_units, incremental_sales_units,  revenue, baseline_revenue, pos_baseline_revenue, incremental_revenue,
			margin, baseline_margin, pos_baseline_margin, incremental_margin,  affinity_revenue, cannibalization_revenue, pull_forward_revenue,
			affinity_margin, cannibalization_margin, pull_forward_margin,  created_by, updated_by, created_at, updated_at, contribution_revenue,
			contribution_margin
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
