--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_halo_coefficient runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_halo_coefficient

DROP PROCEDURE if exists price_promo_opt.pc_simulation_halo_coefficient;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_halo_coefficient(IN var_promo_id integer, IN var_discount_filter_name character varying, IN var_start_date date, IN var_end_date date, IN arr_scenario_id integer[], IN var_stack_flag boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query text;
BEGIN
    query := format($fmt$

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_halo_coefficient%s_%s_%s_driving;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_halo_coefficient%s_%s_%s_driving AS
        SELECT DISTINCT a.product_id, sub_dept, multiplier, min_value, max_value
        FROM %s a
        INNER JOIN price_promo_opt.tb_halo_effect_department_factor_opt b USING(product_id)
        WHERE a.effective_discount > 5;

--============================================================================================================================================================

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_halo_coefficient%s_%s_%s_driven;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_halo_coefficient%s_%s_%s_driven AS
        WITH cte1 AS MATERIALIZED (
            SELECT a.*
            FROM (
                SELECT 
                    concat(a.l0_id, '_' , a.l1_id) AS sub_dept,
                    a.product_id,
                    gs.recommendation_date::date AS recommendation_date,
                    a.promo_base_price,
                    a.cost
                FROM price_promo.product_master a
                INNER JOIN (
                    SELECT DISTINCT sub_dept 
                    FROM price_promo_opt_temp.promo_simulation_halo_coefficient%s_%s_%s_driving
                ) b ON concat(a.l0_id, '_' , a.l1_id) = b.sub_dept
                CROSS JOIN generate_series(%L::date, %L::date, interval '1 day') AS gs(recommendation_date)
                WHERE a.is_active = 1
            ) a
			LEFT JOIN (select distinct product_id from %s where effective_discount > 5) b USING (product_id)
            WHERE b.product_id IS NULL
        )
        SELECT 
            sub_dept, 
            a.product_id AS driven_product_id,
            array_agg(recommendation_date ORDER BY recommendation_date) AS recommendation_dates, 
            promo_base_price, 
            cost
        FROM cte1 a
        LEFT JOIN (
            SELECT DISTINCT product_id, recommendation_date 
            FROM price_promo.ps_recommended_finalized_stack
            WHERE effective_discount > 5 
              AND recommendation_date BETWEEN %L AND %L
        ) b USING (product_id, recommendation_date)
        WHERE b.product_id IS NULL 
          AND b.recommendation_date IS NULL
        GROUP BY sub_dept, a.product_id, promo_base_price, cost;

    $fmt$,
        -- driving tables
        CASE WHEN var_stack_flag THEN '_stack' ELSE '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_'),

        CASE WHEN var_stack_flag THEN '_stack' ELSE '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_'),

        -- discount filter table
        var_discount_filter_name,

        -- driven tables
        CASE WHEN var_stack_flag THEN '_stack' ELSE '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_'),

        CASE WHEN var_stack_flag THEN '_stack' ELSE '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_'),

        CASE WHEN var_stack_flag THEN '_stack' ELSE '' END,
        var_promo_id, array_to_string(arr_scenario_id, '_'),

        -- date range
        var_start_date, var_end_date,

        var_discount_filter_name,

        -- final date filters
        var_start_date, var_end_date
    );

    RAISE NOTICE '%', query;
    EXECUTE query;
END;
$procedure$
;

