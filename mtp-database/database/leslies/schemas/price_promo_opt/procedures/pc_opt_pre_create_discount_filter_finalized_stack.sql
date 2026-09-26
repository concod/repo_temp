--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_create_discount_filter_finalized_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_pre_create_discount_filter_finalized_stack

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_pre_create_discount_filter_finalized_stack ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_create_discount_filter_finalized_stack(IN var_promo_id integer, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query                varchar;
    table_name           varchar := format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s',
                                           var_promo_id, array_to_string(arr_scenario_id, '_'));
    discount_table_name  varchar := format('price_promo_opt_temp.promo_opt_pre_discount_filter_%s_%s',
                                           var_promo_id, array_to_string(arr_scenario_id, '_'));
    var_start_date       date;
    var_end_date         date;
    promo_id_list_stack  varchar;
BEGIN
---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------

    RAISE NOTICE '%', table_name;

    -- promo window
    SELECT start_date, end_date
    INTO   var_start_date, var_end_date
    FROM   price_promo.promo_master
    WHERE  promo_id = var_promo_id;

    -- collect finalized promo ids once (e.g. '(1,2,3)'); fallback to '(-1)' if none
    SELECT COALESCE('(' || string_agg(promo_id_return::text, ',') || ')', '(-1)')
    INTO   promo_id_list_stack
    FROM   price_promo_opt.fn_get_promos_finalized_stack(var_promo_id);

    -- Build query
    query := format($Q$
        DROP TABLE IF EXISTS %1$s;
        CREATE UNLOGGED TABLE %1$s AS
        WITH
        /* keep CTE-3 semantics identical to opt version; only order moved up */
        cte_3 AS (
            SELECT
                product_id,
                promo_id AS review_promo_id,
                scenario_id AS review_scenario_id,
                store_hierarchy,
                prf.customer_id,
                offer_identifier,
                date AS recommendation_date,
                effective_discount AS effective_discount_review,
                priority_number AS priority_y_1
            FROM %2$s prf
            LEFT JOIN price_promo.ps_rules USING (promo_id)
            WHERE scenario_id = ANY(%5$L)
        ),

        /* finalized set now filtered like simulation:
           - promo_id in precomputed list
           - within promo window
           - product_id present in cte_3                                  */
        finalized_cte AS MATERIALIZED (
        select sub1.*,
        row_number() over(partition by product_id, store_hierarchy, customer_id, recommendation_date, priority_number order by effective_discount desc) as row_num ,
        priority_number 
            FROM (
                SELECT
                    promo_id,
                    product_id,
                    store_hierarchy,
                    ps_recommended_finalized.customer_id,
                    recommendation_date,
                    effective_discount,
                    sales_units
                FROM price_promo.ps_recommended_finalized
                WHERE promo_id IN %3$s
                  AND recommendation_date BETWEEN %6$L AND %7$L
                  AND product_id IN (SELECT DISTINCT product_id FROM cte_3)
            ) sub1
            LEFT JOIN price_promo.ps_rules pr USING (promo_id)
        ),

        cte_2 AS (
            SELECT *
            FROM (
                SELECT
                    promo_id AS fin_1_promo_id,
                    product_id,
                    store_hierarchy,
                    finalized_cte.customer_id,
                    recommendation_date,
                    priority_number AS priority_x_1,
                    row_num,
                    effective_discount AS ft1_effective_discount,
                    sales_units AS sales_units_fin_1
                FROM finalized_cte
                WHERE row_num = 1 and  priority_number = 1
            ) ft1
            LEFT JOIN (
                SELECT
                    promo_id AS fin_2_promo_id,
                    product_id,
                    store_hierarchy,
                    finalized_cte.customer_id,
                    recommendation_date,
                    priority_number AS priority_x_2,
                    row_num,
                    effective_discount AS ft2_effective_discount,
                    sales_units AS sales_units_fin_2
                FROM finalized_cte
                WHERE row_num = 1 and priority_number = 2
            ) ft2 USING (product_id, store_hierarchy, customer_id, recommendation_date)
        )

        SELECT
            product_id,
            store_hierarchy,
            sub1.customer_id,
            recommendation_date AS date,
            offer_identifier,
            review_scenario_id AS scenario_id,

            /* --- final stacked discount logic (unchanged) --- */
            CASE
              WHEN fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 1 THEN
                   (1 - (1 - effective_discount_fin_1 * 0.01)
                        * (1 - effective_discount_fin_2 * 0.01)
                        * (1 - effective_discount_review * 0.01)) * 100

              WHEN fin_1_fin_2 = 1 AND fin_2_review = 1 AND fin_1_review = 0 THEN
                   GREATEST(
                     (1 - (1 - effective_discount_fin_1 * 0.01)
                          * (1 - effective_discount_fin_2 * 0.01)) * 100,
                     (1 - (1 - effective_discount_review * 0.01)
                          * (1 - effective_discount_fin_2 * 0.01)) * 100,
                     GREATEST(effective_discount_fin_1, effective_discount_review)
                   )

              WHEN fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 0 THEN
                   GREATEST(
                     (1 - (1 - effective_discount_fin_1 * 0.01)
                          * (1 - effective_discount_fin_2 * 0.01)) * 100,
                     (1 - (1 - effective_discount_fin_1 * 0.01)
                          * (1 - effective_discount_review * 0.01)) * 100,
                     GREATEST(effective_discount_fin_2, effective_discount_review)
                   )

              WHEN fin_1_fin_2 = 0 AND fin_1_review = 1 AND fin_2_review = 1 THEN
                   GREATEST(
                     GREATEST(effective_discount_fin_1, effective_discount_fin_2),
                     (1 - (1 - effective_discount_fin_1 * 0.01)
                          * (1 - effective_discount_review * 0.01)) * 100,
                     (1 - (1 - effective_discount_fin_2 * 0.01)
                          * (1 - effective_discount_review * 0.01)) * 100
                   )

              WHEN fin_1_fin_2 = 0 AND fin_1_review = 0 AND fin_2_review = 1 THEN
                   GREATEST(
                     GREATEST(effective_discount_fin_1, effective_discount_fin_2),
                     GREATEST(effective_discount_fin_1, effective_discount_review),
                     (1 - (1 - effective_discount_fin_2 * 0.01)
                          * (1 - effective_discount_review * 0.01)) * 100
                   )

              WHEN fin_1_fin_2 = 0 AND fin_2_review = 0 AND fin_1_review = 1 THEN
                   GREATEST(
                     GREATEST(effective_discount_fin_1, effective_discount_fin_2),
                     GREATEST(effective_discount_fin_2, effective_discount_review),
                     (1 - (1 - effective_discount_fin_1 * 0.01)
                          * (1 - effective_discount_review * 0.01)) * 100
                   )

              WHEN fin_1_fin_2 = 1 AND fin_1_review = 0 AND fin_2_review = 0 THEN
                   GREATEST(
                     GREATEST(effective_discount_fin_1, effective_discount_review),
                     (1 - (1 - effective_discount_fin_1 * 0.01)
                          * (1 - effective_discount_fin_2 * 0.01)) * 100,
                     GREATEST(effective_discount_fin_2, effective_discount_review)
                   )

              WHEN fin_1_fin_2 = 0 AND fin_1_review = 0 AND fin_2_review = 0 THEN
                   GREATEST(effective_discount_fin_1, effective_discount_fin_2, effective_discount_review)
            END AS final_discount,

            /* --- stacked_baseline_sales_units logic (unchanged, uses 7) --- */
            CASE
              WHEN priority_y_1 = 7 THEN NULL

              WHEN (fin_1_review = 1 AND fin_2_review = 1) AND (priority_x_1 = 7 AND priority_x_2 = 7) THEN
                   CASE WHEN effective_discount_fin_1 > effective_discount_fin_2
                        THEN sales_units_fin_1 ELSE sales_units_fin_2 END

              WHEN (fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 1) AND (priority_x_1 = 7 OR priority_x_2 = 7) THEN
                   CASE WHEN priority_x_1 = 7 THEN sales_units_fin_1 ELSE sales_units_fin_2 END

              WHEN (fin_1_fin_2 = 1 AND fin_2_review = 1 AND fin_1_review = 0) AND (priority_x_2 = 7) THEN
                   sales_units_fin_2

              WHEN (fin_1_fin_2 = 1 AND fin_1_review = 1 AND fin_2_review = 0) AND (priority_x_1 = 7) THEN
                   sales_units_fin_1

              WHEN (fin_1_fin_2 = 0 AND fin_1_review = 1 AND fin_2_review = 1) AND (priority_x_1 = 7 OR priority_x_2 = 7) THEN
                   CASE WHEN priority_x_1 = 7 THEN sales_units_fin_1 ELSE sales_units_fin_2 END

              WHEN (fin_1_fin_2 = 0 AND fin_1_review = 0 AND fin_2_review = 1) AND (priority_x_2 = 7) THEN
                   sales_units_fin_2

              WHEN (fin_1_fin_2 = 0 AND fin_2_review = 0 AND fin_1_review = 1) AND (priority_x_1 = 7) THEN
                   sales_units_fin_1

              WHEN (fin_1_fin_2 = 1 AND fin_1_review = 0 AND fin_2_review = 0) THEN
                   NULL
            END::numeric AS stacked_baseline_sales_units

        FROM (
            SELECT
                review_scenario_id,
                priority_x_2,
                priority_y_1,
                priority_x_1,
                review_promo_id,
                fin_2_promo_id,
                fin_1_promo_id,
                product_id,
                store_hierarchy,
                st.customer_id,
                offer_identifier,
                recommendation_date,
                sales_units_fin_1,
                sales_units_fin_2,
                COALESCE(ft1_effective_discount, 0) AS effective_discount_fin_1,
                COALESCE(ft2_effective_discount, 0) AS effective_discount_fin_2,
                COALESCE(effective_discount_review, 0) AS effective_discount_review,
                COALESCE(fin_1_fin_2::integer, 0) AS fin_1_fin_2,
                COALESCE(fin_1_review::integer, 0) AS fin_1_review,
                COALESCE(fin_2_review::integer, 0) AS fin_2_review
            FROM cte_3 st
            LEFT JOIN cte_2 USING (product_id, store_hierarchy, customer_id, recommendation_date)
            LEFT JOIN (
                SELECT priority_x AS priority_x_1, priority_y AS priority_x_2, is_stackable AS fin_1_fin_2
                FROM price_promo.tb_stacking_priority_rules
            ) tspr1 USING (priority_x_1, priority_x_2)
            LEFT JOIN (
                SELECT priority_x AS priority_x_1, priority_y AS priority_y_1, is_stackable AS fin_1_review
                FROM price_promo.tb_stacking_priority_rules
            ) tspr2 USING (priority_x_1, priority_y_1)
            LEFT JOIN (
                SELECT priority_x AS priority_x_2, priority_y AS priority_y_1, is_stackable AS fin_2_review
                FROM price_promo.tb_stacking_priority_rules
            ) tspr3 USING (priority_x_2, priority_y_1)
       where ft1_effective_discount is not null or ft2_effective_discount is not null
       ) sub1
        WHERE effective_discount_fin_1 IS NOT NULL
    $Q$,
        table_name,             -- %1$s
        discount_table_name,    -- %2$s
        promo_id_list_stack,    -- %3$s
        var_promo_id,           -- kept for notices if needed
        arr_scenario_id,        -- %5$L
        var_start_date,         -- %6$L
        var_end_date            -- %7$L
    );

    RAISE NOTICE '%', query;
    EXECUTE query;

    RAISE NOTICE '%', table_name;
END;
$procedure$
;
