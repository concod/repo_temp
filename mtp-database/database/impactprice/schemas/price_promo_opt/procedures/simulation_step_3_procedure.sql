--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:simulation_step_3_procedure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for simulation_step_3_procedure

DROP PROCEDURE if exists price_promo_opt.simulation_step_3_procedure;
CREATE OR REPLACE PROCEDURE price_promo_opt.simulation_step_3_procedure(IN var_promo_id integer, IN var_scenario_id integer, IN var_simulation_date date, IN var_is_stacked boolean DEFAULT false, IN var_is_intercept boolean DEFAULT false, IN var_target_normal_prefix text DEFAULT 'ps_recommended_scenarios'::text, IN var_target_stack_prefix text DEFAULT 'ps_recommended_scenarios_stack'::text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query text;
    var_week_start_date date;
    week_str text;
    date_str text := to_char(var_simulation_date, 'YYYYMMDD');
    date_formatted text := to_char(var_simulation_date, 'YYYY-MM-DD');
    table_suffix text := format('%s_%s', var_promo_id, var_scenario_id);
    table_2b_raw text := format('simulation_flow_2b_%s', table_suffix);
    table_2b_stack text := format('simulation_flow_2b_stack_%s_%s', table_suffix, date_str);
    table_2b text;  -- actual source: raw or stacked
    table_stacked text := format('simulation_stacked_discounts_table_%s_%s_%s', var_promo_id, var_scenario_id, date_str);
    table_3a text := format('simulation_flow_3a_%s_%s', table_suffix, date_str);
    table_3b text := format('simulation_flow_3b_%s_%s', table_suffix, date_str);
    table_sim_week text;
    table_store_split text;
    table_day_split text;
    table_ps_rec text;
    eff_discount_expr text;
    max_disc_p1_expr text;
    stacked_join_type text;
BEGIN

    SET LOCAL enable_nestloop = off;

    -- Lookup correct simulation_week_start_date from fiscal date mapping
    SELECT simulation_week_start_date INTO var_week_start_date
    FROM global.tb_fiscal_date_mapping
    WHERE date_id = var_simulation_date;

    IF var_week_start_date IS NULL THEN
        RAISE EXCEPTION 'No simulation_week_start_date found in tb_fiscal_date_mapping for date %', var_simulation_date;
    END IF;

    week_str := to_char(var_week_start_date, 'YYYYMMDD');
    RAISE NOTICE 'simulation_date=%, week_start_date=%, week_str=%, stacked=%', var_simulation_date, var_week_start_date, week_str, var_is_stacked;

    -- Build partition table names using week_start_date (not simulation date)
    table_sim_week  := format('tb_simulation_week_opt_%s', week_str);
    table_store_split := format('tb_store_split_opt_%s', week_str);
    table_day_split := format('tb_day_split_opt_%s', date_str);

    -- Choose target table based on stacked flag (uses parameterized prefix for sim vs opt)
    IF var_is_stacked THEN
        table_ps_rec := format('%s_%s_%s', var_target_stack_prefix, var_scenario_id, date_str);
    ELSE
        table_ps_rec := format('%s_%s_%s', var_target_normal_prefix, var_scenario_id, date_str);
    END IF;

    RAISE NOTICE 'Partition tables: sim_week=%, store_split=%, day_split=%, target=%', table_sim_week, table_store_split, table_day_split, table_ps_rec;

    -- ================================================================
    -- STACKED PRE-STEP: Inline report generation
    -- Merge 2B base table with stacked discounts (from step 2C-stack)
    -- Replaces effective_discount and base_percentage with stacked values
    -- ================================================================
    IF var_is_stacked THEN
        RAISE NOTICE 'Stacked flow: merging 2B with stacked discounts table %, intercept=%', table_stacked, var_is_intercept;

        -- intercept_refresh: RIGHT JOIN keeps only products with stacking data; LEFT JOIN keeps all base products
        stacked_join_type := CASE WHEN var_is_intercept THEN 'RIGHT' ELSE 'LEFT' END;

        query := format($fmt$
            DROP TABLE IF EXISTS price_promo_opt_temp.%I;
            CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS
            SELECT
                btn.promo_id, btn.scenario_id, btn.product_id,
                btn.store_reco_level, btn.customer_reco_level,
                btn.l0_cid, btn.l3_cid, btn.s0_id, btn.s1_id, btn.currency_id,
                btn.offer_type_id, btn.offer_type,
                btn.cost, btn.promo_base_price_wo_vat, btn.promo_base_price,
                btn.calculated_discount,
                btn.penetration_factor,
                -- Recalculate base_percentage from stacked effective_discount
                ROUND(COALESCE(stk.final_discount, btn.calculated_discount * btn.penetration_factor)::numeric / 5) * 5 AS base_percentage,
                btn.offer_type_combined_display_name,
                -- Stacked overrides
                COALESCE(stk.final_discount, btn.calculated_discount * btn.penetration_factor) AS stacked_effective_discount,
                COALESCE(stk.max_discount_priority_1, btn.calculated_discount) AS stacked_max_discount_priority_1,
                stk.stacked_baseline_sales_units
            FROM price_promo_opt_temp.%I btn
            %s JOIN price_promo_opt_temp.%I stk
                ON btn.product_id = stk.product_id
                AND btn.store_reco_level = stk.store_reco_level
                AND btn.customer_reco_level = stk.customer_reco_level;
        $fmt$, table_2b_stack, table_2b_stack, table_2b_raw, stacked_join_type, table_stacked);

        RAISE NOTICE 'Step3 table_2b_stack query: %', query;
        EXECUTE query;
        RAISE NOTICE 'Merged stacked table price_promo_opt_temp.% created', table_2b_stack;

        -- Use stacked merged table as source, with stacked column expressions
        table_2b := table_2b_stack;
        -- Rename 3A/3B to avoid collision with normal branch running in parallel
        table_3a := format('simulation_flow_3a_stk_%s_%s', table_suffix, date_str);
        table_3b := format('simulation_flow_3b_stk_%s_%s', table_suffix, date_str);
        eff_discount_expr := 'fd.stacked_effective_discount';
        max_disc_p1_expr  := 'fd.stacked_max_discount_priority_1';
    ELSE
        -- Normal flow: use raw 2B, standard column expressions
        table_2b := table_2b_raw;
        eff_discount_expr := 'fd.calculated_discount * fd.penetration_factor';
        max_disc_p1_expr  := 'fd.calculated_discount';
    END IF;

    -- Step 3A: Join source (2B or 2B_stack) with simulation_week_opt, store_split, day_split, customer_split
    query := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I as
        WITH cte_1 AS (
            SELECT 
                fd.promo_id,
                fd.scenario_id,
                fd.product_id,
                fd.store_reco_level,
                fd.store_reco_level::integer AS store_id,
                fd.customer_reco_level,
                fd.l0_cid,
                fd.l3_cid,
                fd.currency_id,
                fd.promo_base_price_wo_vat,
                promo_base_price,
                fd.cost,
                fd.offer_type_id,
                fd.offer_type,
                %s AS effective_discount,
                %s AS max_discount_priority_1,
                offer_type_combined_display_name,
                fd.penetration_factor,
                smw.base_percentage,
                smw.elasticity,
                smw.sales_units,
                smw.baseline_sales_units
            FROM price_promo_opt_temp.%I fd
            INNER JOIN price_promo_opt.%I smw USING(product_id, base_percentage, s0_id, s1_id)
        )
        SELECT 
            promo_id, scenario_id, product_id, currency_id, promo_base_price_wo_vat, promo_base_price, cost, store_reco_level, customer_reco_level, penetration_factor, offer_type_id, offer_type, effective_discount, elasticity, recommendation_date,
            (promo_base_price_wo_vat) * (100 - COALESCE(max_discount_priority_1, 0)) * 0.01 AS priority_1_discounted_price,
            offer_type_combined_display_name,
            (1 + (COALESCE(elasticity, 0) * (effective_discount - base_percentage) / 100)) * day_split_ratio * storesplit_ratio * customersplit_ratio * (sales_units * CASE WHEN offer_type = 'reg_price' THEN 1.1 ELSE 1 END) AS sales_units_store_day,
            baseline_sales_units * day_split_ratio * storesplit_ratio * customersplit_ratio AS baseline_sales_units
        FROM cte_1
        INNER JOIN (
            SELECT l3_cid, l0_cid, store_id, store_split_ratio AS storesplit_ratio, recommendation_date, day_split_ratio 
            FROM price_promo_opt.%I a
            INNER JOIN (SELECT store_id FROM price_promo.fn_fetch_stores_for_promo(%s)) b USING (store_id)
            INNER JOIN (
                SELECT l0_cid, l3_cid, s0_id, s1_id, date AS recommendation_date, day_split_ratio 
                FROM price_promo_opt.%I
--                WHERE date = %L
            ) d USING(s0_id, s1_id, l3_cid, l0_cid)
        ) ss USING(l3_cid, l0_cid, store_id)
        INNER JOIN (
            SELECT simulation_week_start_date, customer_reco_level, SUM(customer_split_ratio) AS customersplit_ratio 
            FROM price_promo_opt.tb_customer_split_opt a
            WHERE simulation_week_start_date = %L
            GROUP BY simulation_week_start_date, customer_reco_level
        ) cs USING(customer_reco_level);
    $fmt$, table_3a, table_3a,
        eff_discount_expr, max_disc_p1_expr,
        table_2b, table_sim_week, table_store_split, var_promo_id, table_day_split, date_formatted, var_week_start_date::text);

    RAISE NOTICE 'Step3 table_3a query: %', query;
    EXECUTE query;
    RAISE NOTICE 'Table price_promo_opt_temp.% created', table_3a;

    -- Step 3B: Calculate final metrics (identical for normal and stacked)
    query := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS
        WITH subx AS (
            SELECT 
                *, 
                CASE 
                WHEN offer_type IN ('kit_offer', 'bxgy_offer', 'tired_offer', 'special_offer_type') THEN 
                (promo_base_price_wo_vat * (100 - ((((sales_units_store_day - baseline_sales_units) * penetration_factor)) / NULLIF(COALESCE(NULLIF(elasticity, 0), 1) * baseline_sales_units * 0.01, 0))) * 0.01)
                ELSE (promo_base_price_wo_vat * (100 - effective_discount) * 0.01)
                END AS discounted_price,
                CASE 
                WHEN offer_type IN ('kit_offer', 'bxgy_offer', 'tired_offer', 'special_offer_type') THEN 
                (promo_base_price * (100 - ((((sales_units_store_day - baseline_sales_units) * penetration_factor)) / NULLIF(COALESCE(NULLIF(elasticity, 0), 1) * baseline_sales_units * 0.01, 0))) * 0.01)
                ELSE (promo_base_price * (100 - effective_discount) * 0.01)
                END AS discounted_price_with_vat
            FROM price_promo_opt_temp.%I sub_q
        )
        SELECT
            promo_id::int4 AS promo_id,
            scenario_id::int4 AS scenario_id,
            product_id::int8 AS product_id,
            currency_id::int4 AS currency_id,
            recommendation_date::date AS recommendation_date,
            store_reco_level,
            customer_reco_level,
            offer_type_id::int4 AS offer_type_id,
            effective_discount::int4 AS effective_discount,
            cost::float4 AS original_cost,
            discounted_price_with_vat::float4 AS discounted_price,
            sales_units_store_day::float4 AS sales_units,
            baseline_sales_units::float4 AS baseline_sales_units,
            (sales_units_store_day - baseline_sales_units)::float4 AS incremental_sales_units,
            (sales_units_store_day * discounted_price)::float4 AS revenue,
            (baseline_sales_units * promo_base_price_wo_vat)::float4 AS baseline_revenue,
            ((sales_units_store_day * discounted_price) - (baseline_sales_units * promo_base_price_wo_vat))::float4 AS incremental_revenue,
            (sales_units_store_day * (discounted_price - cost))::float4 AS margin_wo_vf,
            ((sales_units_store_day * (discounted_price - cost)) )::float4 AS margin,
            (baseline_sales_units * (promo_base_price_wo_vat - cost))::float4 AS baseline_margin,
            (((sales_units_store_day * (discounted_price - cost))) - (baseline_sales_units * (promo_base_price_wo_vat - cost)))::float4 AS incremental_margin,
            (sales_units_store_day * (promo_base_price_wo_vat - discounted_price)) AS promo_spend,
            (sales_units_store_day * discounted_price) AS contribution_revenue, 
            (sales_units_store_day * (discounted_price - cost)) AS contribution_margin,
            (sales_units_store_day * (promo_base_price_wo_vat - discounted_price)) - (sales_units_store_day * (promo_base_price_wo_vat - priority_1_discounted_price)) AS coupon_spend,
            offer_type_combined_display_name
        FROM subx;
    $fmt$, table_3b, table_3b, table_3a);

    RAISE NOTICE 'Step3 table_3b query: %', query;
    EXECUTE query;
    RAISE NOTICE 'Table price_promo_opt_temp.% created (stacked=%)', table_3b, var_is_stacked;

END;
$procedure$
;
