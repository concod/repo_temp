--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_discount_filter_finalized_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_create_discount_filter_finalized_stack

DROP PROCEDURE if exists price_promo_opt.pc_simulation_create_discount_filter_finalized_stack;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_discount_filter_finalized_stack(IN var_promo_id integer, IN arr_scenario_id integer[], IN var_pccd_table character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE



query varchar;

table_name varchar := format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));

discount_table_name varchar := format('price_promo_opt_temp.scenario_disc_filter_date_stack_%s_%s',var_promo_id, array_to_string(arr_scenario_id, '_'));

var_start_date date;

var_end_date date;

promo_id_list_stack varchar;




BEGIN




-- Purpose: Creates stacked discount tables for promotional scenarios by combining multiple discount sources.
-- Example: CALL price_promo_opt.pc_simulation_create_discount_filter_finalized_stack(12345, ARRAY[100, 101]);
-- Other Functions Used:
--   * price_promo_opt.fn_get_promos_finalized_stack - Retrieves promotions for stacking calculations
-- Tables Used:
--   * price_promo.promo_master - Contains promotion start/end dates
--   * price_promo.ps_recommended_finalized - Contains finalized promotion recommendations
--   * price_promo.ps_rules - Contains promotion rules and priority information
--   * price_promo.tb_stacking_priority_rules - Contains rules for promotion stacking
--   * price_promo_opt_temp.scenario_disc_filter_date_stack - Contains scenario discount data
--   * price_promo_opt_temp.simulation_stacked_discounts_table - Output table with stacked discounts
-- Returns: No direct return value; creates a temporary table with combined stacked discount data
--   including final discount calculations based on priority rules and stackability


raise notice '%',table_name;



SELECT COALESCE(
  '(' || string_agg(promo_id_return::text, ',') || ')',
  '(-1)'
) into promo_id_list_stack
FROM price_promo_opt.fn_get_promos_finalized_stack(var_promo_id);


select start_date, end_date into var_start_date, var_end_date from price_promo.promo_master where promo_id = var_promo_id;



-- Construct the query

query := format('

		DROP TABLE IF EXISTS %s;

		CREATE UNLOGGED TABLE %s AS

		with 
		cte_3 as  materialized  (

		SELECT

		 product_id,promo_id AS review_promo_id,scenario_id as review_scenario_id,

		store_reco_level, customer_reco_level,

		date AS recommendation_date,

		effective_discount AS effective_discount_review,

		priority_number as priority_y_1

		FROM

		%s prf

		left join price_promo.ps_rules using(promo_id)

		%s 

--		WHERE

--		scenario_id = ANY(%L)

),
		-- Optimization: Filter finalized data early using EXISTS instead of IN (SELECT DISTINCT ...)
finalized_data AS (

		SELECT 
        prf.promo_id, 
        prf.product_id,
        prf.store_reco_level, 
        prf.customer_reco_level,
        prf.recommendation_date,
        prf.effective_discount, 
        prf.sales_units,
        pr.priority_number,
        ROW_NUMBER() OVER(
            PARTITION BY prf.product_id, prf.store_reco_level, prf.customer_reco_level, prf.recommendation_date 
            ORDER BY prf.effective_discount DESC
        ) as row_num
    FROM price_promo.ps_recommended_finalized prf
    JOIN price_promo.ps_rules pr USING(promo_id)
    WHERE prf.promo_id in %s
    AND prf.recommendation_date BETWEEN %L AND %L
    AND EXISTS (
        SELECT 1 
        FROM cte_3 c3 
        WHERE c3.product_id = prf.product_id
    )
),

-- Optimization: Use conditional aggregation (pivot) instead of self-joining two subqueries
cte_2 AS (

		SELECT 
        product_id,
        store_reco_level, 
        customer_reco_level,
        recommendation_date,
        MAX(CASE WHEN row_num = 1 THEN promo_id END) as fin_1_promo_id,
        MAX(CASE WHEN row_num = 1 THEN priority_number END) as priority_x_1,
        MAX(CASE WHEN row_num = 1 THEN effective_discount END) as ft1_effective_discount,
        MAX(CASE WHEN row_num = 1 THEN sales_units END) as sales_units_fin_1,
        MAX(CASE WHEN row_num = 2 THEN promo_id END) as fin_2_promo_id,
        MAX(CASE WHEN row_num = 2 THEN priority_number END) as priority_x_2,
        MAX(CASE WHEN row_num = 2 THEN effective_discount END) as ft2_effective_discount,
        MAX(CASE WHEN row_num = 2 THEN sales_units END) as sales_units_fin_2
    FROM finalized_data
    WHERE row_num <= 2
    GROUP BY product_id, store_reco_level, customer_reco_level, recommendation_date
)


SELECT
    st.product_id,
    st.store_reco_level, 
    st.customer_reco_level, 
    st.recommendation_date as date, 
    st.review_scenario_id as scenario_id,

		-- Calculation Logic (Preserved from original)
    CASE
        WHEN COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 1 THEN
            (1 - (1 - COALESCE(ft1_effective_discount,0) * 0.01) * (1 - COALESCE(ft2_effective_discount,0) * 0.01) * (1 - COALESCE(effective_discount_review,0) * 0.01)) * 100

        WHEN COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 0 THEN
            GREATEST(
                (1 - (1 - COALESCE(ft1_effective_discount,0) * 0.01) * (1 - COALESCE(ft2_effective_discount,0) * 0.01)) * 100,
                (1 - (1 - COALESCE(effective_discount_review,0) * 0.01) * (1 - COALESCE(ft2_effective_discount,0) * 0.01)) * 100,
                GREATEST(COALESCE(ft1_effective_discount,0), COALESCE(effective_discount_review,0))
            )

        WHEN COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 0 THEN
            GREATEST(
                (1 - (1 - COALESCE(ft1_effective_discount,0) * 0.01) * (1 - COALESCE(ft2_effective_discount,0) * 0.01)) * 100,
                (1 - (1 - COALESCE(ft1_effective_discount,0) * 0.01) * (1 - COALESCE(effective_discount_review,0) * 0.01)) * 100,
                GREATEST(COALESCE(ft2_effective_discount,0), COALESCE(effective_discount_review,0))
            )

        WHEN COALESCE(tspr1.is_stackable::integer, 0) = 0 AND COALESCE(tspr2.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 1 THEN
            GREATEST(
                GREATEST(COALESCE(ft1_effective_discount,0), COALESCE(ft2_effective_discount,0)),
                (1 - (1 - COALESCE(ft1_effective_discount,0) * 0.01) * (1 - COALESCE(effective_discount_review,0) * 0.01)) * 100,
                (1 - (1 - COALESCE(ft2_effective_discount,0) * 0.01) * (1 - COALESCE(effective_discount_review,0) * 0.01)) * 100
            )

        WHEN COALESCE(tspr1.is_stackable::integer, 0) = 0 AND COALESCE(tspr2.is_stackable::integer, 0) = 0 AND COALESCE(tspr3.is_stackable::integer, 0) = 1 THEN
            GREATEST(
                GREATEST(COALESCE(ft1_effective_discount,0), COALESCE(ft2_effective_discount,0)),
                GREATEST(COALESCE(ft1_effective_discount,0), COALESCE(effective_discount_review,0)),
                (1 - (1 - COALESCE(ft2_effective_discount,0) * 0.01) * (1 - COALESCE(effective_discount_review,0) * 0.01)) * 100
            )

        WHEN COALESCE(tspr1.is_stackable::integer, 0) = 0 AND COALESCE(tspr3.is_stackable::integer, 0) = 0 AND COALESCE(tspr2.is_stackable::integer, 0) = 1 THEN
            GREATEST(
                GREATEST(COALESCE(ft1_effective_discount,0), COALESCE(ft2_effective_discount,0)),
                GREATEST(COALESCE(ft2_effective_discount,0), COALESCE(effective_discount_review,0)),
                (1 - (1 - COALESCE(ft1_effective_discount,0) * 0.01) * (1 - COALESCE(effective_discount_review,0) * 0.01)) * 100
            )

        WHEN COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 0 AND COALESCE(tspr3.is_stackable::integer, 0) = 0 THEN
            GREATEST(
                GREATEST(COALESCE(ft1_effective_discount,0), COALESCE(effective_discount_review,0)),
                (1 - (1 - COALESCE(ft1_effective_discount,0) * 0.01) * (1 - COALESCE(ft2_effective_discount,0) * 0.01)) * 100,
                GREATEST(COALESCE(ft2_effective_discount,0), COALESCE(effective_discount_review,0))
            )

        WHEN COALESCE(tspr1.is_stackable::integer, 0) = 0 AND COALESCE(tspr2.is_stackable::integer, 0) = 0 AND COALESCE(tspr3.is_stackable::integer, 0) = 0 THEN
            GREATEST(COALESCE(ft1_effective_discount,0), COALESCE(ft2_effective_discount,0), COALESCE(effective_discount_review,0))
    END AS final_discount,

	 -- Sales Units Logic
    CASE
        WHEN priority_y_1 = 1 THEN NULL
        WHEN (COALESCE(tspr2.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 1) AND (priority_x_1 = 1 AND priority_x_2 = 1) THEN
            CASE WHEN COALESCE(ft1_effective_discount,0) > COALESCE(ft2_effective_discount,0) THEN sales_units_fin_1 ELSE sales_units_fin_2 END
        WHEN (COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 1) AND (priority_x_1 = 1 OR priority_x_2 = 1) THEN
            CASE WHEN priority_x_1 = 1 THEN sales_units_fin_1 ELSE sales_units_fin_2 END
        WHEN (COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 0) AND (priority_x_2 = 1) THEN
            sales_units_fin_2
        WHEN (COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 0) AND (priority_x_1 = 1) THEN
            sales_units_fin_1
        WHEN (COALESCE(tspr1.is_stackable::integer, 0) = 0 AND COALESCE(tspr2.is_stackable::integer, 0) = 1 AND COALESCE(tspr3.is_stackable::integer, 0) = 1) AND (priority_x_1 = 1 OR priority_x_2 = 1) THEN
            CASE WHEN priority_x_1 = 1 THEN sales_units_fin_1 ELSE sales_units_fin_2 END
        WHEN (COALESCE(tspr1.is_stackable::integer, 0) = 0 AND COALESCE(tspr2.is_stackable::integer, 0) = 0 AND COALESCE(tspr3.is_stackable::integer, 0) = 1) AND (priority_x_2 = 1) THEN
            sales_units_fin_2
        WHEN (COALESCE(tspr1.is_stackable::integer, 0) = 0 AND COALESCE(tspr3.is_stackable::integer, 0) = 0 AND COALESCE(tspr2.is_stackable::integer, 0) = 1) AND (priority_x_1 = 1) THEN
            sales_units_fin_1
        WHEN (COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 0 AND COALESCE(tspr3.is_stackable::integer, 0) = 0) THEN
            NULL
        WHEN (COALESCE(tspr1.is_stackable::integer, 0) = 1 AND COALESCE(tspr2.is_stackable::integer, 0) = 0 AND COALESCE(tspr3.is_stackable::integer, 0) = 0) THEN
            NULL
    END::numeric AS stacked_baseline_sales_units,

    GREATEST(
        CASE WHEN priority_x_1 = 1 THEN ft1_effective_discount ELSE 0 END,
        CASE WHEN priority_x_2 = 1 THEN ft2_effective_discount ELSE 0 END,
        CASE WHEN priority_y_1 = 1 THEN effective_discount_review ELSE 0 END
    ) AS max_discount_priority_1,

    GREATEST(
        CASE WHEN priority_x_1 = 2 THEN ft1_effective_discount ELSE 0 END,
        CASE WHEN priority_x_2 = 2 THEN ft2_effective_discount ELSE 0 END,
        CASE WHEN priority_y_1 = 2 THEN effective_discount_review ELSE 0 END
    ) AS max_discount_priority_2


FROM cte_3 st
LEFT JOIN cte_2 USING (product_id, store_reco_level, customer_reco_level, recommendation_date)
LEFT JOIN price_promo.tb_stacking_priority_rules tspr1 ON tspr1.priority_x = cte_2.priority_x_1 AND tspr1.priority_y = cte_2.priority_x_2
LEFT JOIN price_promo.tb_stacking_priority_rules tspr2 ON tspr2.priority_x = cte_2.priority_x_1 AND tspr2.priority_y = st.priority_y_1
LEFT JOIN price_promo.tb_stacking_priority_rules tspr3 ON tspr3.priority_x = cte_2.priority_x_2 AND tspr3.priority_y = st.priority_y_1
WHERE cte_2.ft1_effective_discount IS NOT NULL


',table_name, table_name, discount_table_name, 
CASE WHEN var_pccd_table IS NOT NULL THEN format('INNER JOIN (select product_id, store_reco_level::VARCHAR AS store_reco_level, customer_reco_level::VARCHAR AS customer_reco_level, recommendation_date AS date from %s) pccd USING(product_id, store_reco_level, customer_reco_level, date)', var_pccd_table) ELSE '' END,
arr_scenario_id, promo_id_list_stack, var_start_date, var_end_date);

-- Print the query

RAISE NOTICE '%', query;

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
PERFORM set_config('enable_nestloop', 'off', true);
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

-- Execute the query

EXECUTE query ;

raise notice '%', table_name;

END;

$procedure$
;
