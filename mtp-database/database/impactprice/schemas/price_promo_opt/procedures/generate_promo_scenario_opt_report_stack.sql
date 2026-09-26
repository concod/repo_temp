--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:generate_promo_scenario_opt_report_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for generate_promo_scenario_opt_report_stack

DROP PROCEDURE if exists price_promo_opt.generate_promo_scenario_opt_report_stack;
-- DROP PROCEDURE price_promo_opt.generate_promo_scenario_report_stack(varchar, varchar, bool, varchar);

CREATE OR REPLACE PROCEDURE price_promo_opt.generate_promo_scenario_report_stack(IN base_table_name character varying, IN join_table_name character varying, IN var_is_intercept boolean DEFAULT false, IN var_pccd_table character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

BEGIN

-- Purpose: Creates a finalized discount table by combining base discount data with stacked discounts.
-- Example: CALL price_promo_opt.generate_promo_scenario_report_stack('price_promo_opt_temp.scenario_disc_filter_date_stack_12345_100', 'price_promo_opt_temp.simulation_stacked_discounts_table_12345_100', FALSE);
-- Other Functions Used:
--   * No direct function calls within this procedure
-- Tables Used:
--   * Input base_table_name - Contains base discount filter data with date and product details
--   * Input join_table_name - Contains stacked discount calculations
--   * Output [base_table_name]_final - Created table with combined discount information
-- Returns: No direct return value; creates a final table combining base discount data with
--   stacked discount calculations, applying effective discount logic and percentage rounding


    -- Construct the query dynamically using the input table names

    query := format('

		DROP TABLE IF EXISTS %s_final;

		create UNLOGGED Table %s_final as

        SELECT

            promo_id, scenario_id, discount_level_value, l0_id, l0_cid,

--			l1_cid, l2_cid, l3_cid, l4_cid, brand_cid, product_pg_id, discount_filter,

			store_reco_level, product_id,customer_reco_level,

            current_price, msrp, "cost",

            promo_duration, NULL::integer as discount_level, created_at,

            offer_type_id, offer_type, calculated_discount, 

            COALESCE(final_discount, effective_discount) AS effective_discount,

			effective_discount as effective_discount_old,

--            offer_distribution_channel, ecom_shipping_cost,

			customer_type, product_selection_type, hierarchy_level_id,

			scan_back_per_product, off_invoice_per_product,

            CASE

                WHEN COALESCE(final_discount, effective_discount) >= 95 THEN 95

                ELSE FLOOR(COALESCE(final_discount, effective_discount) / 5) * 5

                     + CASE WHEN COALESCE(final_discount, effective_discount)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END

            END::integer AS base_percentage,

            offer_identifier, halo_effect_factor, 
--loyalty_factor_final, 
			stacked_baseline_sales_units, date, week_start_date, currency_id,
			second_table.max_discount_priority_1,second_table.max_discount_priority_2,offer_type_combined_display_name, 
			--, discount_constraint_hierachy, product_discount_level_id,

			end_cap_flag

        FROM %s btn

         %s  JOIN  %s second_table

        USING(date, scenario_id, product_id, store_reco_level)

		%s;

    ', base_table_name, base_table_name, base_table_name,CASE WHEN var_is_intercept = TRUE then 'Right' else 'Left' end ,

 join_table_name, CASE WHEN var_pccd_table IS NOT NULL THEN format('INNER JOIN (select product_id, store_reco_level::VARCHAR AS store_reco_level, customer_reco_level::INTEGER AS customer_reco_level, recommendation_date AS date from %s) pccd USING(product_id, store_reco_level, customer_reco_level, date)', var_pccd_table) ELSE '' END);



    -- Raise a notice for debugging (optional)

    RAISE NOTICE 'Executing query: %', query;



    -- Execute the constructed query

    EXECUTE query;



END;

$procedure$
;
