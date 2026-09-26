--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:simulation_step_2_procedure_full runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for simulation_step_2_procedure_full

DROP PROCEDURE if exists price_promo_opt.simulation_step_2_procedure_full;
CREATE OR REPLACE PROCEDURE price_promo_opt.simulation_step_2_procedure_full(IN var_promo_id integer, IN var_scenario_id integer, IN var_scenario_order_id integer DEFAULT 1)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query text;
    scenario_key text := var_scenario_order_id::text;
    table_suffix text := format('%s_%s', var_promo_id, var_scenario_id);
    table_2a_prod text := format('simulation_flow_2a_product_%s', table_suffix);
    table_2a_store text := format('simulation_flow_2a_store_%s', table_suffix);
    table_2a_cust text := format('simulation_flow_2a_customer_%s', table_suffix);
    table_2b text := format('simulation_flow_2b_%s', table_suffix);
    table_step1 text := format('promo_product_filter_step_1_%s', table_suffix);
BEGIN
	SET LOCAL Enable_nestloop to off;
    query := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS (
            SELECT 
                ps.promo_id, 
                ss.product_id, 
                ps.product_level_id,
                ps.store_level_id, 
                COALESCE(ps.customer_level_id, 0) AS customer_level_id,
                (scenario_data->%L->>'scenario_id')::integer AS scenario_id,
                (scenario_data->%L->>'offer_type_id')::integer AS offer_type_id,
                scenario_data->%L->>'offer_type' AS offer_type,
                (scenario_data->%L->>'offer_x_value')::float AS offer_x_value,
                scenario_data->%L->>'offer_x_type' AS offer_x_type,
                (scenario_data->%L->>'offer_y_value')::float AS offer_y_value,
                scenario_data->%L->>'offer_y_type' AS offer_y_type,
                (scenario_data->%L->>'offer_z_value')::float AS offer_z_value,
                scenario_data->%L->>'offer_z_type' AS offer_z_type,
                ((scenario_data->%L->'special_offer_data'->>'customer_reach')::FLOAT) * 0.01 AS customer_reach,
                ((scenario_data->%L->'special_offer_data'->>'customer_redemption_rate')::FLOAT) * 0.01 AS customer_redemption_rate,
                ((scenario_data->%L->'special_offer_data'->>'discount_value')::FLOAT) AS discount_value,
                scenario_data->%L->'special_offer_data'->>'discount_type' AS discount_type,
                scenario_data->%L->>'offer_value' AS offer_type_combined_display_name
            FROM price_promo.ps_scenario_discounts ps
            JOIN price_promo.tb_discount_level_products dls USING (product_level_id)
            JOIN price_promo.fn_fetch_products_for_promo(%s) ss ON ss.promo_id = ps.promo_id AND ss.product_id = dls.product_id
            WHERE ps.promo_id = %s
            UNION 
            SELECT 
                ps.promo_id, 
                COALESCE(dls.product_id, ss.product_id) AS product_id, 
                ps.product_level_id,
                ps.store_level_id, 
                COALESCE(ps.customer_level_id, 0) AS customer_level_id,
                (scenario_data->%L->>'scenario_id')::integer AS scenario_id,
                (scenario_data->%L->>'offer_type_id')::integer AS offer_type_id,
                scenario_data->%L->>'offer_type' AS offer_type,
                (scenario_data->%L->>'offer_x_value')::float AS offer_x_value,
                scenario_data->%L->>'offer_x_type' AS offer_x_type,
                (scenario_data->%L->>'offer_y_value')::float AS offer_y_value,
                scenario_data->%L->>'offer_y_type' AS offer_y_type,
                (scenario_data->%L->>'offer_z_value')::float AS offer_z_value,
                scenario_data->%L->>'offer_z_type' AS offer_z_type,
                ((scenario_data->%L->'special_offer_data'->>'customer_reach')::FLOAT) * 0.01 AS customer_reach,
                ((scenario_data->%L->'special_offer_data'->>'customer_redemption_rate')::FLOAT) * 0.01 AS customer_redemption_rate,
                ((scenario_data->%L->'special_offer_data'->>'discount_value')::FLOAT) AS discount_value,
                scenario_data->%L->'special_offer_data'->>'discount_type' AS discount_type,
                scenario_data->%L->>'offer_value' AS offer_type_combined_display_name
            FROM price_promo.ps_scenario_discounts ps
            LEFT JOIN price_promo.tb_discount_level_products dls USING (product_level_id)
            LEFT JOIN price_promo.fn_fetch_products_for_promo(%s) ss ON ss.promo_id = ps.promo_id
            WHERE ps.promo_id = %s AND dls.product_id IS NULL
            GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
        );
    $fmt$, table_2a_prod, table_2a_prod, 
       scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, 
       var_promo_id, var_promo_id, 
       scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, scenario_key, 
       var_promo_id, var_promo_id);
    
    RAISE NOTICE 'Step2 table_2a_prod query: %', query;
    EXECUTE query;
    RAISE NOTICE 'Table price_promo_opt_temp.% created', table_2a_prod;

    query := format('ANALYZE price_promo_opt_temp.%I', table_2a_prod);
    RAISE NOTICE 'Step2 ANALYZE: %', query;
    EXECUTE query;
    
    query := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS 
        (
            SELECT DISTINCT 
                store_level_id, 
                store_reco_level, 
                s0_id, 
                s1_id, 
                store_id, 
                (1 + COALESCE(vat_percentage, 0) / 100.0) AS vat_divider 
            FROM global.tb_store_master
            INNER JOIN (
                SELECT 
                    ss.store_id, 
                    ps.store_level_id
                FROM price_promo.ps_scenario_discounts ps
                JOIN price_promo.tb_discount_level_stores dls USING (store_level_id)
                JOIN price_promo.fn_fetch_stores_for_promo(%s) ss ON ss.promo_id = ps.promo_id AND ss.store_id = dls.store_id
                WHERE ps.promo_id = %s
                GROUP BY 1, 2
                UNION ALL          
                SELECT 
                    COALESCE(dls.store_id, ss.store_id) AS store_id, 
                    ps.store_level_id
                FROM price_promo.ps_scenario_discounts ps
                LEFT JOIN price_promo.tb_discount_level_stores dls USING (store_level_id)
                LEFT JOIN price_promo.fn_fetch_stores_for_promo(%s) ss ON ss.promo_id = ps.promo_id
                WHERE ps.promo_id = %s AND dls.store_id IS NULL
                GROUP BY 1, 2
            ) ss USING (store_id)
            LEFT JOIN (
                SELECT 
                    s0_id::integer, 
                    vat_percentage * 100::integer AS vat_percentage 
                FROM global.tb_vat_master
            ) vm USING(s0_id)
        );
    $fmt$, table_2a_store, table_2a_store, var_promo_id, var_promo_id, var_promo_id, var_promo_id);

    RAISE NOTICE 'Step2 table_2a_store query: %', query;
    EXECUTE query;
    RAISE NOTICE 'Table price_promo_opt_temp.% created', table_2a_store;
    query := format('ANALYZE price_promo_opt_temp.%I', table_2a_store);
    RAISE NOTICE 'Step2 ANALYZE: %', query;

    query := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I; 
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS (
            SELECT DISTINCT 
                customer_level_id, 
                customer_reco_level 
            FROM global.customer_master
            INNER JOIN (
                SELECT DISTINCT 
                    COALESCE(dls.customer_id, ss.customer_id) AS customer_id, 
                    COALESCE(customer_level_id, 0) AS customer_level_id 
                FROM (SELECT promo_id, customer_level_id FROM price_promo.ps_scenario_discounts WHERE promo_id = %s) ps						
                LEFT JOIN price_promo.tb_discount_level_customers dls USING (customer_level_id)
                LEFT JOIN price_promo.fn_fetch_customers_for_promo(%s) ss USING (promo_id)
            ) USING (customer_id)
        );
    $fmt$, table_2a_cust, table_2a_cust, var_promo_id, var_promo_id);

    RAISE NOTICE 'Step2 table_2a_cust query: %', query;
    EXECUTE query;
    RAISE NOTICE 'Table price_promo_opt_temp.% created', table_2a_cust;
    query := format('ANALYZE price_promo_opt_temp.%I', table_2a_cust);
    RAISE NOTICE 'Step2 ANALYZE: %', query;

    query := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS
        SELECT 
            promo_id, scenario_id, product_id, store_reco_level, customer_reco_level, l0_cid, l3_cid, s0_id, s1_id, currency_id,
            offer_type_id, offer_type, cost, promo_base_price_wo_vat, promo_base_price, calculated_discount, penetration_factor,
            ROUND((calculated_discount * penetration_factor)::numeric / 5) * 5 AS base_percentage,
            offer_type_combined_display_name
        FROM (
            SELECT *,
                COALESCE(
                    CASE
                        WHEN offer_type = 'special_offer_type' THEN customer_reach * customer_redemption_rate
                        WHEN exp_qty > 0 THEN GREATEST(0.3, LEAST(0.98, POWER(0.85, (exp_qty - (CEIL(calculated_discount * 0.1) * (calculated_discount / 100.0))))))
                        ELSE 1
                    END, 1
                ) AS penetration_factor
            FROM (
                SELECT 
                    tab1.promo_id, tab1.scenario_id, tab1.product_id, sr.store_reco_level, cr.customer_reco_level,
                    pdmi.l0_cid, pdmi.l3_cid, sr.s0_id, sr.s1_id, pdmi.currency_id, tab1.offer_type_id, tab1.offer_type,
                    tab1.customer_reach, tab1.customer_redemption_rate,
                    COALESCE(tpsp.cost, pdmi.cost) AS cost,
                    COALESCE(tpsp.promo_base_price, pdmi.promo_base_price) / vat_divider AS promo_base_price_wo_vat,
                    COALESCE(tpsp.promo_base_price, pdmi.promo_base_price) as promo_base_price,
                    LEAST(GREATEST(
                        CASE
                            WHEN offer_type IN ('percent_off', 'upto_x_percent_off') THEN offer_x_value
                            WHEN offer_type = 'extra_amount_off' THEN (offer_x_value / NULLIF(COALESCE(tpsp.promo_base_price, pdmi.promo_base_price), 0)) * 100
                            WHEN offer_type = 'fixed_price' THEN ((COALESCE(tpsp.promo_base_price, pdmi.promo_base_price) - offer_x_value) / NULLIF(COALESCE(tpsp.promo_base_price, pdmi.promo_base_price), 0)) * 100
                            WHEN offer_type = 'bxgx_percent_off' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100
                            WHEN offer_type = 'bxgx' THEN (offer_y_value / (offer_y_value + offer_x_value)) * 100
                            WHEN offer_type IN ('bmsm', 'bmsm_transaction_discount', 'bmsm_fixed_quantity') AND offer_y_type = 'percent_off' THEN offer_y_value
                            WHEN offer_type IN ('bmsm', 'bmsm_transaction_discount', 'bmsm_fixed_quantity') AND offer_y_type = 'dollar_off' THEN 
                                CASE 
                                    WHEN offer_x_type = 'dollar' THEN (offer_y_value / offer_x_value) * 100
                                    WHEN offer_x_type = 'unit' THEN (offer_y_value / (offer_x_value * NULLIF(COALESCE(tpsp.promo_base_price, pdmi.promo_base_price), 0))) * 100
                                END
                            WHEN offer_type IN ('bmsm', 'bmsm_fixed_quantity') AND offer_y_type = 'at_dollar' THEN ((COALESCE(tpsp.promo_base_price, pdmi.promo_base_price) - (offer_y_value / offer_x_value)) / NULLIF(COALESCE(tpsp.promo_base_price, pdmi.promo_base_price), 0)) * 100
                            WHEN offer_type IN ('kit_offer', 'bxgy_offer', 'tiered_offer') THEN 0
                            WHEN offer_type = 'special_offer_type' THEN 
                                CASE 
                                    WHEN discount_type = 'extra_amount_off' THEN (discount_value / NULLIF(COALESCE(tpsp.promo_base_price, pdmi.promo_base_price), 0)) * 100
                                    ELSE discount_value 
                                END
                        END, 0), 100) AS calculated_discount,
                    (CASE
                        WHEN offer_type = 'bmsm' AND offer_x_type = 'dollar' THEN COALESCE(offer_x_value / NULLIF(COALESCE(tpsp.promo_base_price, pdmi.promo_base_price), 0), 0)
                        WHEN offer_type IN ('bmsm', 'bxgx', 'bxgx_percent_off', 'bmsm_fixed_quantity') AND offer_x_type = 'unit' THEN offer_x_value
                    END) - 1 AS exp_qty,
                    offer_type_combined_display_name
                FROM price_promo_opt_temp.%I tab1
                left JOIN price_promo_opt_temp.%I pdmi USING(product_id)
                left JOIN price_promo_opt_temp.%I sr USING(store_level_id)
				INNER JOIN global.tb_latest_inventory tbli USING(product_id, store_id)
                left JOIN price_promo_opt_temp.%I cr USING(customer_level_id)
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM price_promo.tb_product_store_price tpsp
                    WHERE tpsp.product_id = tab1.product_id
                    AND tpsp.store_id = sr.store_id
                    AND tpsp.effective_from_date BETWEEN pdmi.start_date AND pdmi.end_date
                    ORDER BY tpsp.effective_from_date DESC
                    LIMIT 1
                ) tpsp ON true
            ) b1 
        ) final_a1;
    $fmt$, table_2b, table_2b, table_2a_prod, table_step1, table_2a_store, table_2a_cust);

    RAISE NOTICE 'Step2 table_2b query: %', query;
    RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
    PERFORM set_config('enable_nestloop', 'off', true);
    RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);
    EXECUTE query;
    RAISE NOTICE 'Table price_promo_opt_temp.% created', table_2b;

    query := format('ANALYZE price_promo_opt_temp.%I', table_2b);
    RAISE NOTICE 'Step2 ANALYZE: %', query;
    EXECUTE query;
    
END;
$procedure$
;
