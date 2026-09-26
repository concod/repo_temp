--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:generate_promo_scenario_report_stack_common_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for generate_promo_scenario_report_stack_common_data

DROP PROCEDURE if exists price_promo_opt.generate_promo_scenario_report_stack_common_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.generate_promo_scenario_report_stack_common_data(IN base_table_name text, IN join_table_name text)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    query TEXT;
BEGIN
    -- Construct the query dynamically using the input table names
    query := format('
DROP TABLE IF EXISTS %s_final_common_data;
create UNLOGGED TAble %s_final_common_data as
        SELECT 
            promo_id, scenario_id, discount_level_value, l3_cid, l2_cid,
			brand_cid, pg_id, product_id, 
            current_price, msrp, "cost", ecom_shipping_cost, s1_id, 
            promo_duration, discount_level, created_by, created_at, 
            offer_type_id, offer_type, calculated_discount, 
        
            COALESCE(final_discount, effective_discount) AS effective_discount, 
            offer_distribution_channel, customer_type, product_selection_type, hierarchy_level_id, 
            CASE
                WHEN COALESCE(final_discount, effective_discount) >= 95 THEN 95
                ELSE FLOOR(COALESCE(final_discount, effective_discount) / 5) * 5 
                     + CASE WHEN COALESCE(final_discount, effective_discount)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END
            END::integer AS base_percentage, 
            offer_identifier, halo_effect_factor, loyalty_factor_final, stacked_baseline_sales_units, date, week_start_date, s0_id
        FROM %s
        RIGHT JOIN %s
        USING(date, scenario_id, product_id, s0_id, s1_id);
    ', base_table_name, base_table_name, base_table_name, join_table_name);

    -- Raise a notice for debugging (optional)
    RAISE NOTICE 'Executing query: %', query;

    -- Execute the constructed query
    EXECUTE query;

END;
$procedure$



;