--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_simulation_create_gurobi_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_pre_simulation_create_gurobi_data

DROP PROCEDURE if exists price_promo_opt.pc_opt_pre_simulation_create_gurobi_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_simulation_create_gurobi_data(IN var_promo_id integer, IN arr_speed_id integer[], IN var_week_start_date date, IN var_week_end_date date, IN var_start_date date, IN var_end_date date, IN table_suffix character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query varchar;
BEGIN
 
    -- Pulled from simulation_step_3_procedure_v2: disable both nestloop AND mergejoin
    SET LOCAL enable_nestloop = off;
    SET LOCAL enable_mergejoin = off;
 
    -- Call store split procedure to populate temp table
    CALL price_promo_opt.pc_simulation_fetch_store_level_data(
        var_promo_id, var_week_start_date, var_week_end_date, arr_speed_id
    );
 
    query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.promo_gurobi_data_pre_%1$s;
 
        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_gurobi_data_pre_%1$s AS
        WITH 
 
        -- 1. Get Simulation base data
        cte_0 AS MATERIALIZED(
            SELECT product_id, s0_id, s1_id, simulation_week_start_date, base_percentage,
                   sales_units, baseline_sales_units, elasticity
            FROM price_promo_opt.tb_simulation_week_opt
            WHERE simulation_week_start_date BETWEEN %2$L AND %3$L
        ),
 
        -- 2. Materialize TOD Promos once to avoid repeated function calls
        tod_promos AS MATERIALIZED (
            SELECT product_id, store_reco_level::varchar, customer_reco_level::varchar, 
                   MIN(calculated_discount) AS tod_discount
            FROM price_promo_opt.fn_generate_promo_details(
                ARRAY(
                    SELECT a.promo_id FROM price_promo.promo_master a
                    WHERE a.start_date <= %5$L AND a.end_date >= %4$L
                      AND a.execution_metadata->>''offer_marketing_type'' IN (''Tod Deal'')
                      AND status IN (4, 8)
                )
            )
            GROUP BY 1, 2, 3
        ),
 
        -- 3. Consolidate guardrails and TOD effective discounts
        tod_stats AS MATERIALIZED(
            SELECT 
                a.discount_level_value,
                MIN(tod.tod_discount) AS tod_effective_discount,
                MIN(a.effective_discount) AS min_eff,
                MAX(a.effective_discount) AS max_eff,
                MAX(b.suggested_min_discount) AS s_min,
                MIN(b.suggested_max_discount) AS s_max
            FROM price_promo_opt_temp.promo_opt_pre_discount_filter_%1$s a
            LEFT JOIN tod_promos tod USING (product_id, store_reco_level, customer_reco_level)
            LEFT JOIN price_promo_opt.product_channel_discount_guardrails b USING(product_id, s0_id, s1_id)
            GROUP BY 1
        ),
 
        -- 4. Apply Early TOD Filtering
        cte_1 AS MATERIALIZED(
            SELECT 
                fd.*, 
                smw.simulation_week_start_date,
                smw.sales_units, smw.baseline_sales_units, smw.elasticity,
                GREATEST(COALESCE(ts.s_min, ts.min_eff), ts.min_eff) AS suggested_min_discount,
                LEAST(COALESCE(ts.s_max, ts.max_eff), ts.max_eff) AS suggested_max_discount
            FROM price_promo_opt_temp.promo_opt_pre_discount_filter_%1$s fd
            LEFT JOIN cte_0 smw USING(product_id, base_percentage, s0_id, s1_id) 
            LEFT JOIN tod_stats ts USING (discount_level_value)
            WHERE (ts.tod_effective_discount IS NULL OR fd.effective_discount < ts.tod_effective_discount)
        ),
 
        -- 5. Calculate row-level units (Keeping exact original JOIN keys to prevent Tripling)
        sub_q AS MATERIALIZED(
            SELECT
                c.discount_level_value, c.cost,
                (c.current_price / (1 + COALESCE(vm.vat_percentage, 0)/100.0)) * (100 - c.effective_discount) * 0.01 AS discounted_price,
                c.offer_type, c.offer_identifier, c.discount_filter,
                c.sales_units AS sales_units_sim,
                (1 + (COALESCE(c.elasticity,0) * (c.effective_discount - c.base_percentage) / 100.0)) AS elasticity_factor,
                c.scan_back_per_product, c.new_product_flag, c.off_invoice_per_product,
                c.product_id, c.effective_discount AS effective_discount_old,
                c.discount_constraint_hierachy, c.discount_amount,
                c.suggested_min_discount, c.suggested_max_discount,
                COALESCE(ds.day_split_ratio, 1) AS day_split_ratio,
                COALESCE(ss.store_split, 1) AS store_split_factor,
                COALESCE(cs.customer_split_ratio, 1) AS customer_split_factor
            FROM cte_1 c
            -- EXACT Original Join for Store Split
            INNER JOIN price_promo_opt_temp.promo_simulation_store_level_data_%1$s ss 
                USING (simulation_week_start_date, l3_cid, l0_cid, store_reco_level)
            -- EXACT Original Join for Day Split (Includes s0_id, s1_id to prevent duplicates)
            INNER JOIN (
                SELECT l0_cid, s0_id, s1_id, l3_cid, simulation_week_start_date, SUM(day_split_ratio) AS day_split_ratio
                FROM price_promo_opt.tb_day_split_opt
                WHERE date BETWEEN %4$L AND %5$L
                GROUP BY 1, 2, 3, 4, 5
            ) ds USING (l0_cid, s0_id, s1_id, l3_cid, simulation_week_start_date)
            -- EXACT Original Join for Customer Split
            INNER JOIN (
                SELECT simulation_week_start_date, customer_reco_level, SUM(customer_split_ratio) AS customer_split_ratio
                FROM price_promo_opt.tb_customer_split_opt
                WHERE simulation_week_start_date BETWEEN %2$L AND %3$L
                GROUP BY 1, 2
            ) cs USING (simulation_week_start_date, customer_reco_level)
            -- VAT Master Join
            LEFT JOIN (
                SELECT s0_id, vat_percentage * 100::integer AS vat_percentage
                FROM global.tb_vat_master
            ) vm USING (s0_id)
        ),
 
        -- 6. Pre-calculate metrics to avoid duplicate math in SUM()
        subquery_calc_2 AS MATERIALIZED(
            SELECT 
                discount_constraint_hierachy::text AS discount_constraint_hierachy,
                discount_level_value::text AS opt_level_bins,
                offer_type, offer_identifier, discount_filter,
                ROUND(COALESCE(SUM(calc_units),0)::numeric,2)::float AS sales_units,
                ROUND(COALESCE(SUM(calc_units * discounted_price),0)::numeric,2)::float AS revenue,
                ROUND(COALESCE(SUM(calc_units * (discounted_price - cost)),0)::numeric,2)::float AS margin_wo_vf,
                ROUND(COALESCE(COUNT(DISTINCT product_id),1),0)::int AS sku_count,
                ROUND(COALESCE(AVG(effective_discount_old),0),0)::float AS effective_percentage_discount,
                ROUND(COALESCE(SUM(scan_back_per_product),0)::numeric,2)::float AS scan_back_per_discount_level,
                ROUND(COALESCE(SUM(off_invoice_per_product),0)::numeric,2)::float AS off_invoice_per_discount_levl,
                MIN(COALESCE(new_product_flag,0)) AS new_product_flag,
                ROUND(COALESCE(SUM(discount_amount * calc_units),0)::numeric,2)::float AS promo_spend,
                ROUND(COALESCE(AVG(suggested_min_discount),0)::numeric,2)::float AS suggested_min_discount, 
                ROUND(COALESCE(AVG(suggested_max_discount),0)::numeric,2)::float AS suggested_max_discount
            FROM (
                SELECT *,
                       (elasticity_factor * store_split_factor * day_split_ratio * customer_split_factor * sales_units_sim)::float8 AS calc_units
                FROM sub_q
            ) sq1
            GROUP BY 1,2,3,4,5
        )
 
        -- 7. Final output with window function and filters
        SELECT
            COALESCE(discount_constraint_hierachy, ''0'') AS discount_constraint_hierachy,
            COALESCE(opt_level_bins,''-200'') AS opt_level_bins,
            offer_type, offer_identifier, discount_filter AS offer_value,
            COALESCE(sales_units,0) AS sales_units,
            COALESCE(revenue,0) AS revenue,
            COALESCE(margin_wo_vf,0) AS margin_wo_vf,
            COALESCE(ROUND((margin_wo_vf + ((scan_back_per_discount_level + off_invoice_per_discount_levl) * sales_units))::numeric,2),0)::float AS margin,
            sku_count, effective_percentage_discount,
            COALESCE(promo_spend,0) AS promo_spend,
            COALESCE(suggested_min_discount,0) AS suggested_min_discount, 
            COALESCE(suggested_max_discount,0) AS suggested_max_discount
        FROM (
            SELECT *, 
                   ROW_NUMBER() OVER (PARTITION BY opt_level_bins ORDER BY effective_percentage_discount ASC) AS rn 
            FROM subquery_calc_2
        ) final_1 
        WHERE new_product_flag = 0 OR rn = 1
    ',
    table_suffix,          -- %1$s
    var_week_start_date,   -- %2$L (cte_0, cs)
    var_week_end_date,     -- %3$L (cte_0, cs)
    var_start_date,        -- %4$L (tod_promos end_date logic, ds start)
    var_end_date           -- %5$L (tod_promos start_date logic, ds end)
    );
 
    -- Print and execute
    RAISE NOTICE '%', query;
    EXECUTE query;
 
END;
$procedure$
;
