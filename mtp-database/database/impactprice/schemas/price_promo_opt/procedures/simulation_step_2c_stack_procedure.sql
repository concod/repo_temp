--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:simulation_step_2c_stack_procedure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for simulation_step_2c_stack_procedure

DROP PROCEDURE if exists price_promo_opt.simulation_step_2c_stack_procedure;
CREATE OR REPLACE PROCEDURE price_promo_opt.simulation_step_2c_stack_procedure(IN var_promo_id integer, IN arr_scenario_id integer[], IN var_filter_date date DEFAULT NULL::date, IN var_pccd_table character varying DEFAULT NULL::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query varchar;
    var_effective_date date;
    date_suffix varchar;
    table_name varchar;
    -- Base discount table is simulation_flow_2B (created by step 2)
    discount_table_name varchar := format('price_promo_opt_temp.simulation_flow_2b_%s_%s', var_promo_id, array_to_string(arr_scenario_id, '_'));
    var_start_date date;
    var_end_date date;
    promo_id_list_stack varchar;
BEGIN

    -- Get promo start/end dates
    SELECT start_date, end_date INTO var_start_date, var_end_date
    FROM price_promo.promo_master WHERE promo_id = var_promo_id;

    -- Use provided filter_date, else fall back to promo start_date
    var_effective_date := COALESCE(var_filter_date, var_start_date);
    date_suffix := to_char(var_effective_date, 'YYYYMMDD');

    -- Date-suffixed output table (safe for parallel multi-date execution)
    table_name := format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s_%s',
                         var_promo_id, array_to_string(arr_scenario_id, '_'), date_suffix);

    RAISE NOTICE 'Creating stacked discounts table: % (filter_date=%)', table_name, var_effective_date;

    -- Get the list of promos to stack against
    SELECT COALESCE(
        '(' || string_agg(promo_id_return::text, ',') || ')',
        '(-1)'
    ) INTO promo_id_list_stack
    FROM price_promo_opt.fn_get_promos_finalized_stack(var_promo_id);

    RAISE NOTICE 'promo_id=%, filter_date=%, stacking_promos=%', var_promo_id, var_effective_date, promo_id_list_stack;

    -- Construct the query (optimized: EXISTS filter, conditional aggregation, direct tspr JOINs)
    query := format('

        DROP TABLE IF EXISTS %s;

        CREATE UNLOGGED TABLE %s AS

        WITH
        cte_3 AS MATERIALIZED (
            SELECT
                product_id,
                promo_id AS review_promo_id,
                scenario_id AS review_scenario_id,
                store_reco_level,
                customer_reco_level,
                (calculated_discount * penetration_factor) AS effective_discount_review,
                priority_number AS priority_y_1
            FROM %s prf
            LEFT JOIN price_promo.ps_rules USING(promo_id)
            %s
        ),

        -- Optimization: EXISTS instead of IN (SELECT DISTINCT ...), INNER JOIN ps_rules
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
                    PARTITION BY prf.product_id, prf.store_reco_level, prf.customer_reco_level,pr.priority_number
                    ORDER BY prf.effective_discount DESC
                ) AS row_num
            FROM price_promo.ps_recommended_finalized prf
            JOIN price_promo.ps_rules pr USING(promo_id)
            WHERE prf.promo_id IN %s
              AND prf.recommendation_date = %L
              AND EXISTS (
                  SELECT 1 FROM cte_3 c3 WHERE c3.product_id = prf.product_id
              )
        ),

        -- Optimization: conditional aggregation (pivot) instead of self-join
        cte_2 AS (
            SELECT
                product_id,
                store_reco_level,
                customer_reco_level,
                MAX(CASE WHEN row_num = 1 THEN promo_id END) AS fin_1_promo_id,
                MAX(CASE WHEN row_num = 1 THEN priority_number END) AS priority_x_1,
                MAX(CASE WHEN row_num = 1 THEN effective_discount END) AS ft1_effective_discount,
                MAX(CASE WHEN row_num = 1 THEN sales_units END) AS sales_units_fin_1,
                MAX(CASE WHEN row_num = 2 THEN promo_id END) AS fin_2_promo_id,
                MAX(CASE WHEN row_num = 2 THEN priority_number END) AS priority_x_2,
                MAX(CASE WHEN row_num = 2 THEN effective_discount END) AS ft2_effective_discount,
                MAX(CASE WHEN row_num = 2 THEN sales_units END) AS sales_units_fin_2
            FROM finalized_data
            WHERE row_num <= 2
            GROUP BY product_id, store_reco_level, customer_reco_level
        )

        SELECT
            st.product_id,
            st.store_reco_level,
            st.customer_reco_level,
            st.review_scenario_id AS scenario_id,

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
        INNER JOIN cte_2 USING (product_id, store_reco_level, customer_reco_level)
        LEFT JOIN price_promo.tb_stacking_priority_rules tspr1 ON tspr1.priority_x = cte_2.priority_x_1 AND tspr1.priority_y = cte_2.priority_x_2
        LEFT JOIN price_promo.tb_stacking_priority_rules tspr2 ON tspr2.priority_x = cte_2.priority_x_1 AND tspr2.priority_y = st.priority_y_1
        LEFT JOIN price_promo.tb_stacking_priority_rules tspr3 ON tspr3.priority_x = cte_2.priority_x_2 AND tspr3.priority_y = st.priority_y_1

    ', table_name, table_name, discount_table_name,
    CASE WHEN var_pccd_table IS NOT NULL THEN format('INNER JOIN (SELECT product_id, store_reco_level::VARCHAR AS store_reco_level, customer_reco_level::VARCHAR AS customer_reco_level FROM %s) pccd USING(product_id, store_reco_level, customer_reco_level)', var_pccd_table) ELSE '' END,
    promo_id_list_stack,
    var_effective_date
    );

    RAISE NOTICE '%', query;

    RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
    PERFORM set_config('enable_nestloop', 'off', true);
    RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

    EXECUTE query;

    RAISE NOTICE '1-day stacked discounts table created: %', table_name;

END;
$procedure$
;
