--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:generate_promo_scenario_report_stack_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for generate_promo_scenario_report_stack_date

DROP PROCEDURE if exists price_promo_opt.generate_promo_scenario_report_stack_date;
CREATE OR REPLACE PROCEDURE price_promo_opt.generate_promo_scenario_report_stack_date(IN base_table_name character varying, IN join_table_name character varying, IN var_filter_date date, IN var_is_intercept boolean DEFAULT false, IN var_pccd_table character varying DEFAULT NULL::character varying, IN var_promo_id integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    query varchar;
    output_table_name varchar;
    var_week_start_date date;
BEGIN

-- Purpose: PER-DATE version - Creates finalized discount table for a SINGLE date.
-- Called from Python in parallel for each date to speed up stacked flow.
-- Output table: {base_table_name}_final_{YYYYMMDD}
-- Example: CALL price_promo_opt.generate_promo_scenario_report_stack_date(
--     'price_promo_opt_temp.scenario_disc_filter_date_stack_540_1129',
--     'price_promo_opt_temp.simulation_stacked_discounts_table_540_1129_20260308',
--     '2026-03-08', FALSE, NULL, 540);

    output_table_name := format('%s_final_%s', base_table_name, to_char(var_filter_date, 'YYYYMMDD'));

    -- Look up week_start_date for this single date
    SELECT simulation_week_start_date INTO var_week_start_date
    FROM global.tb_fiscal_date_mapping WHERE date_id = var_filter_date;

    -- Per-date version: base table (btn) has NO date/week_start_date columns.
    -- date from second_table (stacked table), week_start_date injected as literal.
    -- JOIN between btn and second_table uses product_id, store_reco_level, customer_reco_level (no date).

    query := format('

		DROP TABLE IF EXISTS %s;

		create UNLOGGED Table %s as

        SELECT

            promo_id, btn.scenario_id, discount_level_value, l0_id, l0_cid, l3_cid, s0_id,

			btn.store_reco_level, s1_id, btn.product_id, btn.customer_reco_level,

            current_price, msrp, "cost",

            promo_duration, NULL::integer as discount_level, created_at,

            offer_type_id, offer_type, calculated_discount, 

            COALESCE(final_discount, effective_discount) AS effective_discount,

			effective_discount as effective_discount_old,

			customer_type, product_selection_type, hierarchy_level_id,

			scan_back_per_product, off_invoice_per_product,

            CASE

                WHEN COALESCE(final_discount, effective_discount) >= 95 THEN 95

                ELSE FLOOR(COALESCE(final_discount, effective_discount) / 5) * 5

                     + CASE WHEN COALESCE(final_discount, effective_discount)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END

            END::integer AS base_percentage,

            offer_identifier,  
			stacked_baseline_sales_units, second_table.date, %L::date AS week_start_date,
			 currency_id,
			second_table.max_discount_priority_1,second_table.max_discount_priority_2,offer_type_combined_display_name, 

			end_cap_flag, penetration_factor

        FROM %s btn

        %s  JOIN  %s second_table 
			ON btn.product_id = second_table.product_id 
			AND btn.store_reco_level = second_table.store_reco_level 
			AND btn.customer_reco_level = second_table.customer_reco_level
  
		%s;

    ', output_table_name, output_table_name, var_week_start_date, base_table_name,

CASE WHEN var_is_intercept = TRUE then 'Right' else 'Left' end ,

join_table_name,

CASE WHEN var_pccd_table IS NOT NULL THEN format('INNER JOIN (select product_id, store_reco_level::VARCHAR AS store_reco_level, customer_reco_level::VARCHAR AS customer_reco_level, recommendation_date AS date from %s WHERE recommendation_date = %L) pccd ON btn.product_id = pccd.product_id AND btn.store_reco_level = pccd.store_reco_level AND btn.customer_reco_level = pccd.customer_reco_level', var_pccd_table, var_filter_date) ELSE '' END);

    -- Raise a notice for debugging
    RAISE NOTICE 'Executing per-date report_stack for date: % -> table: %', var_filter_date, output_table_name;
    RAISE NOTICE 'Query: %', query;

    -- Execute the constructed query
    EXECUTE query;

END;

$procedure$
;
