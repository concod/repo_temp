--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:simulation_stacking_1_day_procedure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for simulation_stacking_1_day_procedure

DROP PROCEDURE if exists price_promo_opt.simulation_stacking_1_day_procedure;
CREATE OR REPLACE PROCEDURE price_promo_opt.simulation_stacking_1_day_procedure(IN var_promo_id integer, IN var_scenario_id integer, IN var_simulation_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query text;
    table_name text := format('simulation_stacked_discounts_table_%s_%s', var_promo_id, var_scenario_id);
    table_2b text := format('simulation_flow_2B_%s_%s', var_promo_id, var_scenario_id);
    promo_id_list_stack text;
BEGIN
    SELECT COALESCE(
      '(' || string_agg(promo_id_return::text, ',') || ')',
      '(-1)'
    ) INTO promo_id_list_stack
    FROM price_promo_opt.fn_get_promos_finalized_stack(var_promo_id);

    query := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS

        WITH cte_3 AS (
            SELECT
                product_id,
                promo_id AS review_promo_id,
                scenario_id AS review_scenario_id,
                store_reco_level, 
                customer_reco_level,
                (calculated_discount * penetration_factor) AS effective_discount_review,
                priority_number AS priority_y_1
            FROM price_promo_opt_temp.%I prf
            LEFT JOIN price_promo.ps_rules USING(promo_id)
        ),
        finalized_data AS (
            SELECT 
                prf.promo_id, 
                prf.product_id,
                prf.store_reco_level, 
                prf.customer_reco_level,
                prf.effective_discount, 
                prf.sales_units,
                pr.priority_number,
                ROW_NUMBER() OVER(
                    PARTITION BY prf.product_id, prf.store_reco_level, prf.customer_reco_level
                    ORDER BY prf.effective_discount DESC
                ) as row_num
            FROM price_promo.ps_recommended_finalized prf
            JOIN price_promo.ps_rules pr USING(promo_id)
            WHERE prf.promo_id IN %s
            AND prf.recommendation_date = %L
            AND EXISTS (
                SELECT 1 
                FROM cte_3 c3 
                WHERE c3.product_id = prf.product_id
            )
        ),
        cte_2 AS (
            SELECT 
                product_id,
                store_reco_level, 
                customer_reco_level,
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
            GROUP BY product_id, store_reco_level, customer_reco_level
        )
        SELECT
            st.product_id,
            st.store_reco_level, 
            st.customer_reco_level, 
            st.review_scenario_id as scenario_id,

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
        LEFT JOIN cte_2 USING (product_id, store_reco_level, customer_reco_level)
        LEFT JOIN price_promo.tb_stacking_priority_rules tspr1 ON tspr1.priority_x = cte_2.priority_x_1 AND tspr1.priority_y = cte_2.priority_x_2
        LEFT JOIN price_promo.tb_stacking_priority_rules tspr2 ON tspr2.priority_x = cte_2.priority_x_1 AND tspr2.priority_y = st.priority_y_1
        LEFT JOIN price_promo.tb_stacking_priority_rules tspr3 ON tspr3.priority_x = cte_2.priority_x_2 AND tspr3.priority_y = st.priority_y_1
        WHERE cte_2.ft1_effective_discount IS NOT NULL
    $fmt$, table_name, table_name, table_2b, promo_id_list_stack, var_simulation_date);

    EXECUTE query;
    RAISE NOTICE 'Table price_promo_opt_temp.% created for stacking', table_name;

END;
$procedure$
;
