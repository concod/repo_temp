--liquibase formatted sql
--changeset divyasree.bingimalla@impactanalytics.co:fn_generate_promo_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_generate_promo_details

DROP FUNCTION if exists price_promo_opt.fn_generate_promo_details;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_generate_promo_details(var_promo_ids integer[])
 RETURNS TABLE(promo_id integer, start_date date, end_date date, promo_name character varying, offer_type character varying, product_level_id integer, scenario_id integer, offer_type_id integer, offer_x_value double precision, offer_x_type character varying, offer_y_value double precision, offer_y_type character varying, offer_z_value double precision, offer_z_type character varying, tier_id integer, customer_reach double precision, customer_redemption_rate double precision, discount_value double precision, discount_type character varying, l0_id integer, currency_id integer, l0_cid integer, l3_cid integer, store_reco_level character varying, s0_id integer, s1_id integer, c0_id integer, discount_level_value character varying, offer_type_combined_display_name character varying, product_id integer, customer_reco_level character varying, customer_type character varying, product_selection_type character varying, store_selection_type character varying, hierarchy_level_id integer, promo_duration integer, msrp double precision, cost double precision, current_price double precision, avg_current_price double precision, calculated_discount double precision, base_percentage double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
    query text;
	var_promo_id INTEGER;
	start_date date;
	end_date date;
    table_2a_prod text := format('promo_product_details_%s', var_promo_ids);
    table_2a_store text := format('promo_store_details_%s', var_promo_ids);
    table_2a_cust text := format('promo_customer_details_%s', var_promo_ids);
    table_2b text := format('simulation_flow_2b_%s', var_promo_ids);
BEGIN

	SET LOCAL Enable_nestloop to off;

FOREACH var_promo_id IN ARRAY var_promo_ids LOOP

RAISE NOTICE 'Processing promo_id: %', var_promo_id;
	
	SELECT pm.start_date, pm.end_date
	INTO start_date, end_date
	FROM price_promo.promo_master pm
	WHERE pm.promo_id = var_promo_id;
		
    query := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS (

		with cte0 as 
			(
	            -- Get metrics from scenarios
	            SELECT 
	                sm.promo_id,
	                sm.scenario_order_id, scenario_name,
	                pm.last_approved_scenario_id
	                
	            from price_promo.scenario_master sm
	            join price_promo.promo_master pm on sm.scenario_id = pm.last_approved_scenario_id
	            where pm.promo_id = %s
        	)

			,flattened_scenarios AS
			(
	            SELECT psd.promo_id, psd.product_level_id,psd.store_level_id,coalesce(psd.customer_level_id,0) as customer_level_id,
	                   key::TEXT AS scenario_key, value AS scenario_data
	                   
	            FROM price_promo.ps_scenario_discounts psd,
	                 jsonb_each(psd.scenario_data)
	            WHERE psd.promo_id = %s
			           
			)

            SELECT 
                ps.promo_id, 
                ss.product_id, 
                ps.product_level_id,
                ps.store_level_id, 
                COALESCE(ps.customer_level_id, 0) AS customer_level_id,
                (scenario_data->>'scenario_id')::integer AS scenario_id,
                (scenario_data->>'offer_type_id')::integer AS offer_type_id,
                scenario_data->>'offer_type' AS offer_type,
                (scenario_data->>'offer_x_value')::float AS offer_x_value,
                scenario_data->>'offer_x_type' AS offer_x_type,
                (scenario_data->>'offer_y_value')::float AS offer_y_value,
                scenario_data->>'offer_y_type' AS offer_y_type,
                (scenario_data->>'offer_z_value')::float AS offer_z_value,
                scenario_data->>'offer_z_type' AS offer_z_type,
                ((scenario_data->'special_offer_data'->>'customer_reach')::FLOAT) * 0.01 AS customer_reach,
                ((scenario_data->'special_offer_data'->>'customer_redemption_rate')::FLOAT) * 0.01 AS customer_redemption_rate,
                ((scenario_data->'special_offer_data'->>'discount_value')::FLOAT) AS discount_value,
                scenario_data->'special_offer_data'->>'discount_type' AS discount_type,
				(scenario_data->>'tier_id')::integer AS tier_id,
                scenario_data->>'offer_value' AS offer_type_combined_display_name
            FROM flattened_scenarios ps join cte0 sm on ps.scenario_key::int = sm.scenario_order_id::int  
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
                (scenario_data->>'scenario_id')::integer AS scenario_id,
                (scenario_data->>'offer_type_id')::integer AS offer_type_id,
                scenario_data->>'offer_type' AS offer_type,
                (scenario_data->>'offer_x_value')::float AS offer_x_value,
                scenario_data->>'offer_x_type' AS offer_x_type,
                (scenario_data->>'offer_y_value')::float AS offer_y_value,
                scenario_data->>'offer_y_type' AS offer_y_type,
                (scenario_data->>'offer_z_value')::float AS offer_z_value,
                scenario_data->>'offer_z_type' AS offer_z_type,
                ((scenario_data->'special_offer_data'->>'customer_reach')::FLOAT) * 0.01 AS customer_reach,
                ((scenario_data->'special_offer_data'->>'customer_redemption_rate')::FLOAT) * 0.01 AS customer_redemption_rate,
                ((scenario_data->'special_offer_data'->>'discount_value')::FLOAT) AS discount_value,
                scenario_data->'special_offer_data'->>'discount_type' AS discount_type,
				(scenario_data->>'tier_id')::integer AS tier_id,
                scenario_data->>'offer_value' AS offer_type_combined_display_name
            FROM flattened_scenarios ps join cte0 sm on ps.scenario_key::int = sm.scenario_order_id::int  
            LEFT JOIN price_promo.tb_discount_level_products dls USING (product_level_id)
            LEFT JOIN price_promo.fn_fetch_products_for_promo(%s) ss ON ss.promo_id = ps.promo_id
            WHERE ps.promo_id = %s AND dls.product_id IS NULL
--            GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
        );
    $fmt$, table_2a_prod, table_2a_prod, var_promo_id, var_promo_id, var_promo_id, var_promo_id, var_promo_id, var_promo_id);
    
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
            FROM pricesmart.tb_store_master
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
                customer_reco_level , c0_id
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
        SELECT 
            promo_id, pm.start_date, pm.end_date, price_promo.impute_special_characters(pm.name):: character varying as promo_name, offer_type:: character varying, product_level_id::integer, scenario_id, offer_type_id, offer_x_value, offer_x_type:: character varying, offer_y_value, offer_y_type:: character varying, offer_z_value, offer_z_type:: character varying, tier_id, customer_reach,
			customer_redemption_rate, discount_value, discount_type:: character varying, l0_id, final_a1.currency_id, l0_cid, l3_cid, store_reco_level:: character varying, s0_id, s1_id, c0_id, concat(coalesce(product_level_id,0), '_', coalesce(store_level_id,0), '_', coalesce(customer_level_id,0))::character varying AS discount_level_value, offer_type_combined_display_name:: character varying, product_id, customer_reco_level:: character varying, customer_type:: character varying, 
			product_selection_type:: character varying, store_selection_type:: character varying, NULL::integer as hierarchy_level_id, (pm.end_date - pm.start_date) as promo_duration, msrp::double precision, cost::double precision, current_price::double precision, avg_current_price::double precision, calculated_discount::double precision, (ROUND((calculated_discount)::numeric / 5) * 5)::double precision AS base_percentage
            
        FROM (
            SELECT *
--                ,COALESCE(
--                    CASE
--                        WHEN offer_type = 'special_offer_type' THEN customer_reach * customer_redemption_rate
--                        WHEN exp_qty > 0 THEN GREATEST(0.3, LEAST(0.98, POWER(0.85, (exp_qty - (CEIL(calculated_discount * 0.1) * (calculated_discount / 100.0))))))
--                        ELSE 1
--                    END, 1
--                ) AS penetration_factor
            FROM (
                SELECT 
                    tab1.promo_id, tab1.scenario_id, tab1.product_id, sr.store_reco_level, cr.customer_reco_level,
                    l0_id, pdmi.l0_cid, pdmi.l3_cid, sr.s0_id, sr.s1_id, pdmi.currency_id, tab1.offer_type_id, tab1.offer_type,
                    tab1.customer_reach, tab1.customer_redemption_rate, product_level_id,offer_x_value, c0_id, store_level_id, customer_level_id,
					offer_x_type, offer_y_value, offer_y_type, offer_z_value, offer_z_type, tier_id, discount_value, discount_type,msrp,current_price, COALESCE(tpsp.promo_base_price, pdmi.promo_base_price) as avg_current_price,
                    COALESCE(tpsp.cost, pdmi.cost) AS cost,
--                    COALESCE(tpsp.promo_base_price, pdmi.promo_base_price) / vat_divider AS promo_base_price_wo_vat,
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
                INNER JOIN price_promo.product_master pdmi USING(product_id)
                INNER JOIN price_promo_opt_temp.%I sr USING(store_level_id)
--				INNER JOIN global.tb_latest_inventory tbli USING(product_id, store_id)
                INNER JOIN price_promo_opt_temp.%I cr USING(customer_level_id)
                LEFT JOIN LATERAL (
                    SELECT *
                    FROM price_promo.tb_product_store_price tpsp
                    WHERE tpsp.product_id = tab1.product_id
                    AND tpsp.store_id = sr.store_id
                    AND tpsp.effective_from_date BETWEEN %L AND %L
                    ORDER BY tpsp.effective_from_date DESC
                    LIMIT 1
                ) tpsp ON true
            ) b1 
        ) final_a1
		inner join price_promo.promo_master pm using(promo_id);
    $fmt$, table_2a_prod, table_2a_store, table_2a_cust, start_date, end_date);

    RAISE NOTICE 'Step2 table_2b query: %', query;
    RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
    PERFORM set_config('enable_nestloop', 'off', true);
    RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);
    RETURN QUERY EXECUTE query;
	END LOOP; -- End of FOREACH loop

	RAISE NOTICE 'Finished processing all promo_ids';

	RETURN;
    
END;
$function$
;
