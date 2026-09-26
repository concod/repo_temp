--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pre_generate_promo_scenario_report_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pre_generate_promo_scenario_report_stack

DROP PROCEDURE if exists price_promo_opt.pre_generate_promo_scenario_report_stack;
CREATE OR REPLACE PROCEDURE price_promo_opt.pre_generate_promo_scenario_report_stack(IN base_table_name character varying, IN join_table_name character varying, IN var_is_intercept boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query varchar;
BEGIN
    -- Construct the query dynamically using the input table names
    query := format('
		DROP TABLE IF EXISTS %s_final;
		create UNLOGGED Table %s_final as
        SELECT
            promo_id, scenario_id, discount_level_value, 
			l0_cid, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid, discount_filter,
			s0_id, s1_id, product_id,store_hierarchy,customer_id,
            current_price, msrp, "cost", ecom_shipping_cost,
            promo_duration, NULL::integer as discount_level, created_at,
            offer_type_id, offer_type, calculated_discount, 
            COALESCE(final_discount, effective_discount) AS effective_discount,
			effective_discount as effective_discount_old,
            offer_distribution_channel, customer_type, product_selection_type, hierarchy_level_id,
            CASE
                WHEN COALESCE(final_discount, effective_discount) >= 95 THEN 95
                ELSE FLOOR(COALESCE(final_discount, effective_discount) / 5) * 5
                     + CASE WHEN COALESCE(final_discount, effective_discount)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END
            END::integer AS base_percentage,
            offer_identifier, halo_effect_factor, loyalty_factor_final, stacked_baseline_sales_units, date, week_start_date, discount_constraint_hierachy, product_discount_level_id
        FROM %s
         %s  JOIN  %s
        USING(date, scenario_id, product_id, store_hierarchy, offer_identifier);
    ', base_table_name, base_table_name, base_table_name,CASE WHEN var_is_intercept = TRUE then 'Right' else 'Left' end ,
 join_table_name);

    -- Raise a notice for debugging (optional)
    RAISE NOTICE 'Executing query: %', query;

    -- Execute the constructed query
    EXECUTE query;

END;
$procedure$



;