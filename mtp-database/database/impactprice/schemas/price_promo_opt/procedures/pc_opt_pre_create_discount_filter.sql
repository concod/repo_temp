--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_pre_create_discount_filter

DROP PROCEDURE if exists price_promo_opt.pc_opt_pre_create_discount_filter;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_create_discount_filter(IN var_promo_id integer, IN var_speed_id integer, IN acceptable_price_flag boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query varchar;
    temp_table_name varchar;
    table_suffix varchar;
    -- sub-step table names (simulation step 2 split approach)
    tbl_2a_product varchar;
    tbl_2a_store varchar;
    tbl_2a_customer varchar;
BEGIN

SET LOCAL enable_nestloop to off;

    table_suffix := format('%s_%s', var_promo_id, var_speed_id);

    -- Final output table (same name as original for compatibility)
    temp_table_name := format('price_promo_opt_temp.promo_opt_pre_discount_filter_%s', table_suffix);

    -- Sub-step table names (simulation step 2 split approach)
    tbl_2a_product  := format('price_promo_opt_temp.pre_2a_product_%s', table_suffix);
    tbl_2a_store    := format('price_promo_opt_temp.pre_2a_store_%s', table_suffix);
    tbl_2a_customer := format('price_promo_opt_temp.pre_2a_customer_%s', table_suffix);

    -- ================================================================
    -- STEP 2A-PRODUCT: Materialize product + discount level data
    -- (Pulled from simulation_step_2_procedure product resolution)
    -- Benefit: ANALYZE gives planner accurate row estimates for subsequent joins
    -- ================================================================
    query := format($fmt$
        DROP TABLE IF EXISTS %s;
        CREATE UNLOGGED TABLE %s AS (
            SELECT 
                ps.promo_id, 
                ss.product_id,
                ps.product_level_id, new_product_flag,
                ss.user_metadata,
                ps.store_level_id, 
                COALESCE(ps.customer_level_id, 0) AS customer_level_id, 
                currency_id, l0_id
            FROM price_promo.ps_scenario_discounts ps
            JOIN price_promo.tb_discount_level_products dls USING (product_level_id)
            JOIN price_promo.promo_product_%s ss 
                ON ss.promo_id = ps.promo_id AND ss.product_id = dls.product_id
            JOIN price_promo.product_master pdm ON pdm.product_id = dls.product_id
            WHERE ps.promo_id = %s

            UNION ALL

            SELECT 
                ps.promo_id, 
                COALESCE(dls.product_id, ss.product_id) AS product_id, 
                ps.product_level_id, new_product_flag, 
                ss.user_metadata,
                ps.store_level_id, 
                COALESCE(ps.customer_level_id, 0) AS customer_level_id, 
                currency_id, l0_id
            FROM price_promo.ps_scenario_discounts ps
            LEFT JOIN price_promo.tb_discount_level_products dls USING (product_level_id)
            LEFT JOIN price_promo.promo_product_%s ss ON ss.promo_id = ps.promo_id
            JOIN price_promo.product_master pdm ON pdm.product_id = ss.product_id
            WHERE ps.promo_id = %s AND dls.product_id IS NULL
            GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
        );
        ANALYZE %s;
    $fmt$,
        tbl_2a_product, tbl_2a_product,
        var_promo_id, var_promo_id,
        var_promo_id, var_promo_id,
        tbl_2a_product
    );
    RAISE NOTICE 'Step 2A-Product: %', query;
    EXECUTE query;

    -- ================================================================
    -- STEP 2A-STORE: Materialize store reco levels separately
    -- (Pulled from simulation_step_2_procedure store resolution)
    -- Avoids repeated fn_fetch_stores_for_promo calls in main query
    -- ================================================================
    query := format($fmt$
        DROP TABLE IF EXISTS %s;
        CREATE UNLOGGED TABLE %s AS (
            SELECT DISTINCT store_level_id, store_reco_level,
			-- store_reco_level::integer as store_id, 
			s0_id, s1_id
            FROM pricesmart.tb_store_master
            INNER JOIN (
                SELECT ss.store_id, ps.store_level_id
                FROM price_promo.ps_scenario_discounts ps
                JOIN price_promo.tb_discount_level_stores dls USING (store_level_id)
                JOIN price_promo.fn_fetch_stores_for_promo(%s) ss 
                    ON ss.promo_id = ps.promo_id AND ss.store_id = dls.store_id
                WHERE ps.promo_id = %s
                GROUP BY 1, 2

                UNION ALL

                SELECT COALESCE(dls.store_id, ss.store_id) AS store_id, ps.store_level_id
                FROM price_promo.ps_scenario_discounts ps
                LEFT JOIN price_promo.tb_discount_level_stores dls USING (store_level_id)
                LEFT JOIN price_promo.fn_fetch_stores_for_promo(%s) ss ON ss.promo_id = ps.promo_id
                WHERE ps.promo_id = %s AND dls.store_id IS NULL
                GROUP BY 1, 2
            ) ss USING (store_id)
        );
        ANALYZE %s;
    $fmt$,
        tbl_2a_store, tbl_2a_store,
        var_promo_id, var_promo_id,
        var_promo_id, var_promo_id,
        tbl_2a_store
    );
    RAISE NOTICE 'Step 2A-Store: %', query;
    EXECUTE query;

    -- ================================================================
    -- STEP 2A-CUSTOMER: Materialize customer reco levels separately
    -- (Pulled from simulation_step_2_procedure customer resolution)
    -- ================================================================
    query := format($fmt$
        DROP TABLE IF EXISTS %s;
        CREATE UNLOGGED TABLE %s AS (
            SELECT DISTINCT customer_level_id, customer_reco_level, c0_id
            FROM global.customer_master
            INNER JOIN (
                SELECT DISTINCT 
                    COALESCE(dls.customer_id, ss.customer_id) AS customer_id, 
                    COALESCE(customer_level_id, 0) AS customer_level_id 
                FROM (
                    SELECT promo_id, customer_level_id 
                    FROM price_promo.ps_scenario_discounts 
                    WHERE promo_id = %s
                ) ps
                LEFT JOIN price_promo.tb_discount_level_customers dls USING (customer_level_id)
                LEFT JOIN price_promo.fn_fetch_customers_for_promo(%s) ss USING (promo_id)
            ) USING (customer_id)
        );
        ANALYZE %s;
    $fmt$,
        tbl_2a_customer, tbl_2a_customer,
        var_promo_id, var_promo_id,
        tbl_2a_customer
    );
    RAISE NOTICE 'Step 2A-Customer: %', query;
    EXECUTE query;

    -- ================================================================
    -- FINAL STEP (2B): Join materialized product + store + customer + offers
    -- Then calc discount, penetration, effective_discount, base_percentage
    --
    -- Changes from original:
    --   1. Replaced inline product/store/customer subqueries with materialized temp tables
    --   2. Removed psd_price LEFT JOIN (dead code: LIMIT 0 never returns rows)
    --      → All COALESCE(psd.x, psd_price.x) simplified to psd.x
    --   3. Removed CROSS JOIN with fiscal dates (no stacking needed)
    --   4. Removed date_columns (week_start_date, date) from output
    --   5. Structure: sub1(product_filter) LEFT JOIN sub2(disc_changes+tiered) preserved exactly
    -- ================================================================
    query := format($fmt$
        DROP TABLE IF EXISTS %1$s;
        CREATE UNLOGGED TABLE %1$s AS (
            WITH disc_changes AS (
                SELECT
                    tab1.promo_id::integer AS promo_id,
                    NULL::date AS created_at,
                    psd.offer_type,
                    tab1.promo_id::integer AS scenario_id,
                    psd.opt_discount_type_id AS offer_type_id,
                    psd.offer_x_value,
                    psd.offer_x_type,
                    (psd.offer_y_value)::float AS offer_y_value,
                    psd.offer_y_type,
                    (psd.offer_z_value)::float AS offer_z_value,
                    psd.offer_z_type,
                    NULL::integer AS tier_id,
                    tab1.l0_id,
                    sr.store_reco_level,
                    cr.customer_reco_level,
                    sr.s0_id, sr.s1_id,
                    CONCAT(COALESCE(tab1.product_level_id,0),'_',COALESCE(tab1.store_level_id,0),'_',COALESCE(tab1.customer_level_id,0)) AS discount_level_value,
                    NULL::varchar AS offer_type_combined_display_name,
                    COALESCE(tab1.product_id,0)::integer AS product_id, tab1.new_product_flag,
                    psd.offer_identifier,
                    psd.discount_filter,
                    0 AS scan_back,
                    0 AS off_invoice,
                    (tab1.user_metadata->>'endcap_flag')::integer AS end_cap_flag

                FROM %2$s tab1

                LEFT JOIN %3$s sr USING (store_level_id)

                LEFT JOIN %4$s cr USING (customer_level_id)
				
				-- INNER JOIN global.tb_latest_inventory USING(product_id, store_id)
                LEFT JOIN (
                    SELECT DISTINCT *
                    FROM price_promo_opt.master_valid_offers
                    INNER JOIN price_promo_opt.fn_get_rules_data(%5$s) USING (offer_type)
                    WHERE (discount_filter BETWEEN min_discount AND max_discount)
                       OR (discount_filter = ANY(
                            CASE WHEN discount_type_values::integer[] IS NULL
                                 THEN ARRAY[]::integer[]
                                 ELSE discount_type_values::integer[] END))
                ) psd USING (promo_id, currency_id)
            ),

            opt_offer AS (
                SELECT
                    sub1.*, sub2.store_reco_level, sub2.s0_id, sub2.s1_id,
                    sub2.customer_reco_level, sub2.scenario_id,
                    sub2.discount_level_value,
                    sub2.offer_type_id, sub2.offer_type,
                    sub2.offer_x_value, sub2.offer_x_type,
                    sub2.offer_y_value, sub2.offer_y_type,
                    sub2.offer_z_value, sub2.offer_z_type,
                    sub2.tier_id, sub2.offer_type_combined_display_name,
                    sub2.max_tier, sub2.tiered_offer_indicator,
                    sub2.created_at, sub2.offer_identifier, sub2.discount_filter,
                    sub2.scan_back, sub2.off_invoice, sub2.end_cap_flag,
                    LEAST(
                        GREATEST(
                            CASE
                                WHEN sub2.offer_type IN ('percent_off','upto_x_percent_off') THEN sub2.offer_x_value
                                WHEN sub2.offer_type = 'extra_amount_off' THEN COALESCE(((sub2.offer_x_value / NULLIF(sub1.current_price,0)) * 100),0)
                                WHEN sub2.offer_type = 'fixed_price' THEN COALESCE((((sub1.current_price - sub2.offer_x_value) / NULLIF(sub1.current_price,0)) * 100),0)
                                WHEN sub2.offer_type = 'bxgx_percent_off' THEN ((sub2.offer_z_value * 0.01 * sub2.offer_y_value) / (sub2.offer_y_value + sub2.offer_x_value)) * 100
                                WHEN sub2.offer_type = 'bxgx' THEN ((sub2.offer_y_value / (sub2.offer_y_value + sub2.offer_x_value)) * 100)
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'dollar' AND sub2.offer_y_type = 'percent_off' THEN sub2.offer_y_value
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'unit'   AND sub2.offer_y_type = 'percent_off' THEN sub2.offer_y_value
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'dollar' AND sub2.offer_y_type = 'dollar_off' THEN ((sub2.offer_y_value / sub2.offer_x_value) * 100)
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'unit'   AND sub2.offer_y_type = 'dollar_off' THEN COALESCE(((sub2.offer_y_value / (sub2.offer_x_value * NULLIF(sub1.current_price,0))) * 100),0)
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'unit'   AND sub2.offer_y_type = 'at_dollar'  THEN COALESCE((((sub1.current_price - (sub2.offer_y_value / sub2.offer_x_value)) / NULLIF(sub1.current_price,0)) * 100),0)
                            END,
                            0
                        ),
                        100
                    ) AS calculated_discount,
                    LEAST(
                        GREATEST(
                            CASE
                                WHEN sub2.offer_type IN ('percent_off','upto_x_percent_off') THEN sub2.offer_x_value
                                WHEN sub2.offer_type = 'extra_amount_off' THEN COALESCE(((sub2.offer_x_value / NULLIF(sub1.avg_current_price,0)) * 100),0)
                                WHEN sub2.offer_type = 'fixed_price' THEN COALESCE((((sub1.avg_current_price - sub2.offer_x_value) / NULLIF(sub1.avg_current_price,0)) * 100),0)
                                WHEN sub2.offer_type = 'bxgx_percent_off' THEN ((sub2.offer_z_value * 0.01 * sub2.offer_y_value) / (sub2.offer_y_value + sub2.offer_x_value)) * 100
                                WHEN sub2.offer_type = 'bxgx' THEN ((sub2.offer_y_value / (sub2.offer_y_value + sub2.offer_x_value)) * 100)
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'dollar' AND sub2.offer_y_type = 'percent_off' THEN sub2.offer_y_value
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'unit'   AND sub2.offer_y_type = 'percent_off' THEN sub2.offer_y_value
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'dollar' AND sub2.offer_y_type = 'dollar_off' THEN ((sub2.offer_y_value / sub2.offer_x_value) * 100)
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'unit'   AND sub2.offer_y_type = 'dollar_off' THEN COALESCE(((sub2.offer_y_value / (sub2.offer_x_value * NULLIF(sub1.avg_current_price,0))) * 100),0)
                                WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'unit'   AND sub2.offer_y_type = 'at_dollar'  THEN COALESCE((((sub1.avg_current_price - (sub2.offer_y_value / sub2.offer_x_value)) / NULLIF(sub1.avg_current_price,0)) * 100),0)
                            END * 0.01,
                            0
                        ),
                        1
                    ) AS temp_discount,
                    (
                        CASE
                            WHEN sub2.offer_type = 'bmsm' AND sub2.offer_x_type = 'dollar' THEN COALESCE(sub2.offer_x_value / NULLIF(sub1.avg_current_price,0),0)
                            WHEN sub2.offer_type IN ('bmsm','bxgx','bxgx_percent_off') AND sub2.offer_x_type = 'unit' THEN sub2.offer_x_value
                        END
                    ) - 1 AS exp_qty
                FROM (
                    SELECT
                        promo_id, product_id, l0_id,
                        l0_cid, l1_cid, l3_cid,
                        msrp, current_price, avg_current_price,
                        customer_type, product_selection_type,
                        hierarchy_level_id, cost, promo_duration,
                        1 AS discount_constraint_hierachy,
                        pf.product_discount_level_id, pf.new_product_flag, pphl.product_discount_level, pphl.min_discount
                    FROM price_promo_opt_temp.promo_product_filter_resim_%5$s_%6$s pf
                    INNER JOIN (
                        SELECT
                            promo_id, min_discount,
                            CASE WHEN 7 = ANY(product_discount_level) THEN 7 ELSE NULL END AS product_discount_level
                        FROM price_promo.ps_rules
                    ) pphl USING(promo_id)
                ) as sub1

                LEFT JOIN (
                    SELECT
                        psd.promo_id, product_id,
                        store_reco_level, s0_id, s1_id,
                        customer_reco_level, scenario_id,
                        discount_level_value,
                        COALESCE(tpsd.offer_type_id, psd.offer_type_id) AS offer_type_id,
                        COALESCE(tpsd.offer_type, psd.offer_type) AS offer_type,
                        COALESCE(tpsd.offer_x_value, psd.offer_x_value) AS offer_x_value,
                        COALESCE(tpsd.offer_x_type, psd.offer_x_type) AS offer_x_type,
                        COALESCE(tpsd.offer_y_value, psd.offer_y_value) AS offer_y_value,
                        COALESCE(tpsd.offer_y_type, psd.offer_y_type) AS offer_y_type,
                        COALESCE(tpsd.offer_z_value, psd.offer_z_value) AS offer_z_value,
                        COALESCE(tpsd.offer_z_type, psd.offer_z_type) AS offer_z_type,
                        COALESCE(tpsd.tier_id, psd.tier_id) AS tier_id,
                        psd.offer_type_combined_display_name,
                        COALESCE(tpsd.max_tier,1) AS max_tier,
                        COALESCE(tpsd.tiered_offer_indicator,0) AS tiered_offer_indicator,
                        created_at, offer_identifier, discount_filter,
                        scan_back, off_invoice, psd.end_cap_flag
                    FROM disc_changes psd
                    LEFT JOIN price_promo_opt.fn_simulation_tiered_offer_calculation(ARRAY[%6$s]) tpsd USING (tier_id)
                ) sub2 USING (promo_id, product_id)
            ),

            final_discount AS (
                SELECT DISTINCT
                    oo.promo_id, oo.scenario_id, oo.discount_level_value,
                    oo.product_id, oo.store_reco_level, oo.customer_reco_level,
                    oo.l0_id, l0_cid, l1_cid, l3_cid,
                    oo.current_price, msrp, oo.cost, promo_duration,
                    oo.offer_type_id, oo.offer_type,
                    oo.offer_x_value, oo.offer_x_type,
                    oo.offer_y_value, oo.offer_y_type,
                    oo.offer_z_value, oo.offer_z_type,
                    oo.tier_id, oo.offer_type_combined_display_name,
                    calculated_discount,
                    COALESCE(
                        otp.offer_pen_factor,
                        CASE
                            WHEN exp_qty > 0 THEN
                                GREATEST(0.3, LEAST(0.98, POWER(0.85, (exp_qty - (LEAST(ROUND((ceil(temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * temp_discount)))))
                            ELSE 1
                        END,
                        1
                    ) AS penetration_factor,
                    customer_type, product_selection_type, hierarchy_level_id,
                    scan_back, off_invoice, created_at,
                    offer_identifier, discount_filter,
                    discount_constraint_hierachy,
                    product_discount_level_id,
                    oo.end_cap_flag, oo.new_product_flag,
                    oo.s0_id, oo.s1_id
                FROM opt_offer oo
                LEFT JOIN price_promo_opt.tb_offer_type_penetration otp
                    ON oo.offer_type = otp.offer_type
                   AND oo.offer_x_type = otp.offer_x_type
                   AND oo.offer_y_type = otp.offer_y_type
                   AND oo.offer_x_value::numeric = otp.offer_x_value::numeric
                   AND oo.offer_y_value::numeric = otp.offer_y_value::numeric
                   AND oo.offer_z_type IS NOT DISTINCT FROM otp.offer_z_type
                   AND oo.offer_z_value IS NOT DISTINCT FROM otp.offer_z_value
                   AND oo.l0_id = otp.l0_id
            )

            SELECT
                promo_id, scenario_id, discount_level_value, product_id,
                store_reco_level, customer_reco_level,
                l0_cid, l1_cid, l3_cid,
                current_price, msrp, cost, promo_duration, created_at,
                offer_type_id, offer_type,
                ROUND(calculated_discount::numeric, 2) AS calculated_discount,
                penetration_factor,
                ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) AS effective_discount,
                (msrp * ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) / 100)::numeric AS discount_amount,
                customer_type, product_selection_type, hierarchy_level_id,
                CASE
                    WHEN COALESCE(calculated_discount * penetration_factor, 0) >= 95 THEN 95
                    ELSE FLOOR(COALESCE(calculated_discount * penetration_factor, 0) / 5) * 5
                         + CASE WHEN COALESCE(calculated_discount * penetration_factor, 0)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END
                END::integer AS base_percentage,
                offer_identifier, discount_filter,
                discount_constraint_hierachy,
                product_discount_level_id,
                s0_id, s1_id,
                (scan_back) AS scan_back_per_product,
                (off_invoice) AS off_invoice_per_product,
                fd.end_cap_flag, fd.new_product_flag
            FROM final_discount fd
        );

        CREATE INDEX %7$s_idx ON %1$s USING btree (product_id);
        CREATE INDEX %7$s_product_base ON %1$s USING btree (product_id, base_percentage);
    $fmt$,
        temp_table_name,                                              -- %1$s
        tbl_2a_product,                                               -- %2$s
        tbl_2a_store,                                                 -- %3$s
        tbl_2a_customer,                                              -- %4$s
        var_promo_id,                                                 -- %5$s
        var_speed_id,                                                 -- %6$s
        split_part(temp_table_name, '.', 2)                           -- %7$s
    );

    RAISE NOTICE '%', query;
    EXECUTE query;

    -- Cleanup intermediate temp tables
    EXECUTE format('DROP TABLE IF EXISTS %s', tbl_2a_product);
    EXECUTE format('DROP TABLE IF EXISTS %s', tbl_2a_store);
    EXECUTE format('DROP TABLE IF EXISTS %s', tbl_2a_customer);

END;
$procedure$
;
