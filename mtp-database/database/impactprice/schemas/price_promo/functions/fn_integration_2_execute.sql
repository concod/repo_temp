--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:integration_execute_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:integration
--comment: Function to retrieve promotion execution data with discounts applied

DROP FUNCTION IF EXISTS price_promo.fn_integration_2_execute;
CREATE OR REPLACE FUNCTION price_promo.fn_integration_2_execute(_promo_id integer)
 RETURNS TABLE(promo_id integer, event_id integer, event_name text, offer_name text, price_start_date date, price_end_date date, brand text, productcode text, brandsku text, productprice numeric, saleprice numeric, currency text, "user" text, user_mail text, module text, offer_type text, offer_value integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
        /*
        Purpose: Retrieves promotion execution data with discounts applied for a single promotion ID.
                Uses finalized discounts from approved scenarios and applies price point mapping.
        
        Example: SELECT * FROM price_promo.fn_integration_2_execute(123);
        
        Other Functions Used:
        - price_promo.fn_fetch_stores_for_promo: For retrieving stores applicable to the promotion
        - price_promo.get_offer_description_v2: For formatting offer descriptions
        
        Tables Used:
        - price_promo.promo_master: For promotion details
        - price_promo.event_master: For event information
        - price_promo.scenario_master: For approved scenario details
        - price_promo.ps_rules: For discount level settings
        - price_promo.tb_discount_level_products: For product filtering
        - price_promo.tb_discount_level_stores: For store filtering
        - price_promo.tb_acceptable_price_points: For price point mapping
        - price_promo.product_master: For product details
        - global.user_master: For user information
        - pricesmart.planned_forex_rate: For currency conversion rates
        
        Returns: Table with promotion data including discounted prices for execution
        */
    DECLARE
        _use_all_products BOOLEAN;
        _use_all_stores BOOLEAN;
        _start_date DATE;
        _end_date DATE;
        _event_id INTEGER;
        _event_name TEXT;
        _scenario_order_id INTEGER;
        _last_approved_scenario_id INTEGER;
        _forex_multiplier FLOAT;
        product_join_sql TEXT;
        store_join_sql TEXT;
        dyn_sql TEXT;
        _promo_product_table TEXT := quote_ident('price_promo') || '.' || quote_ident('promo_product_' || _promo_id);
        _log_message TEXT;
        _user_name TEXT;
        _user_email TEXT;
        _created_by INTEGER;
    BEGIN
        -- Log function start
        _log_message := ':Starting execution for promo_id=' || _promo_id;
        RAISE NOTICE '%', _log_message;
        
        -- Check if ps_rules has -200 as values for product_discount_level
        SELECT EXISTS (
            SELECT 1 FROM price_promo.ps_rules pr 
            WHERE pr.promo_id = _promo_id AND 
            -200 = ANY(pr.product_discount_level)
        ) INTO _use_all_products;
        
        _log_message := '_use_all_products=' || _use_all_products;
        RAISE NOTICE '%', _log_message;
        
        -- Check if ps_rules has -200 as values for store_discount_level
        SELECT EXISTS (
            SELECT 1 FROM price_promo.ps_rules pr 
            WHERE pr.promo_id = _promo_id AND 
            -200 = ANY(pr.store_discount_level)
        ) INTO _use_all_stores;
        
        _log_message := '_use_all_stores=' || _use_all_stores;
        RAISE NOTICE '%', _log_message;
        
        -- Define product join SQL based on _use_all_products flag
        IF _use_all_products THEN
            -- When using all products, join directly with product_master
            product_join_sql := 'CROSS JOIN cte_promo_products pp';
        ELSE
            -- When filtering by discount level, join through tb_discount_level_products
            product_join_sql := 'JOIN price_promo.tb_discount_level_products dlp ON dlp.product_level_id = se.product_level_id 
                                JOIN cte_promo_products pp ON dlp.product_id = pp.product_id';
        END IF;
        
        _log_message := 'Product join SQL - ' || product_join_sql;
        RAISE NOTICE '%', _log_message;
        
        -- Compute average forex multiplier
        SELECT COALESCE(AVG(planned_conversion_multiplier), 1.17) INTO _forex_multiplier
        FROM pricesmart.planned_forex_rate
        INNER JOIN price_promo.promo_master pm
        ON date BETWEEN start_date AND end_date
        WHERE pm.promo_id = _promo_id
        AND source_currency_id = 4  -- This is GBP (UK primary currency)
        AND target_currency_id = 3; -- This is EUR (UK secondary currency)
        
        _log_message := 'Forex multiplier calculated - ' || _forex_multiplier;
        RAISE NOTICE '%', _log_message;

        -- Construct the exact query that will be executed using format() for better readability
        dyn_sql := format($f$
        WITH cte_promo_products AS (
                SELECT 
                    pm.product_id, pm.l0_cid, 
                    pm.currency AS currency,
                    pm.l0_name AS brand, 
                    pm.l6_name AS productcode,
                    pm.brandsku AS brandsku,
                    ROUND(pm.msrp_with_vat::numeric, 2) AS productprice,
                    pm.currency_id
                FROM %1$s pp
                JOIN price_promo.product_master pm USING (product_id)
                where pm.msrp_with_vat is not null
            ),

            promo_metadata as 
            (SELECT 
                pm.promo_id, pm.name as offer_name, pm.start_date, pm.end_date, 
                pm.last_approved_scenario_id, pm.created_by,
                em.event_id, em.name as event_name, 
                sm.scenario_order_id,
                um."name" as user_name, um.email as user_mail    
            FROM price_promo.promo_master pm
            INNER JOIN price_promo.event_master em ON pm.event_id = em.event_id
            INNER JOIN price_promo.scenario_master sm ON pm.promo_id = sm.promo_id
            INNER JOIN "global".user_master um on um.user_code = pm.created_by
            WHERE pm.promo_id = %2$s
            AND pm.last_approved_scenario_id = sm.scenario_id
            limit 1),

            flattened_scenarios AS (
                SELECT psd.promo_id, psd.product_level_id, psd.store_level_id, psd.customer_level_id,
                    key::TEXT AS scenario_key, value AS scenario_json
                FROM price_promo.ps_scenario_discounts psd,
                    jsonb_each(psd.scenario_data)
                WHERE psd.promo_id = %2$s
            ),
            scenario_expanded AS (
                SELECT
                    fs.promo_id, fs.product_level_id, fs.store_level_id, fs.customer_level_id,
                    (fs.scenario_json->>'scenario_order_id')::INT AS scenario_order_id,
                    COALESCE(NULLIF(fs.scenario_json->>'scenario_name', ''), 'IA Recommended')::text AS scenario_name,
                    (fs.scenario_json->>'offer_type')::text AS offer_type,
                    (fs.scenario_json->>'offer_x_value')::FLOAT AS offer_x_value,
                    (fs.scenario_json->>'offer_y_value')::FLOAT AS offer_y_value,
                    (fs.scenario_json->>'offer_z_value')::FLOAT AS offer_z_value,
                    (fs.scenario_json->>'offer_x_type')::text AS offer_x_type,
                    (fs.scenario_json->>'offer_y_type')::text AS offer_y_type,
                    (fs.scenario_json->>'tier_id')::INT AS tier_id,
                    fs.scenario_json->'special_offer_data' AS special_offer_data
                FROM flattened_scenarios fs
                
            ),

            base_data AS (
                SELECT
                    se.promo_id,
                    pmd.event_id,
                    pmd.event_name,
                    pmd.offer_name,
                    pmd.start_date AS price_start_date,
                    pmd.end_date AS price_end_date,
                    pp.l0_cid,
                    pp.brand,
                    pp.productcode,
                    pp.brandsku,
                    pp.productprice,
                    CASE se.offer_type
                        WHEN 'percent_off' THEN ROUND((pp.productprice * (1 - se.offer_x_value / 100))::numeric, 2)
                        WHEN 'upto_x_percent_off' THEN ROUND((pp.productprice * (1 - se.offer_x_value / 100))::numeric, 2)
                        WHEN 'extra_amount_off' THEN ROUND((pp.productprice - se.offer_x_value)::numeric, 2)
                        WHEN 'fixed_price' THEN ROUND(se.offer_x_value::numeric, 2)
                        ELSE pp.productprice
                    END AS raw_price,
                    pp.currency,
                    pp.currency_id,
                    pmd.user_name,
                    pmd.user_mail,
                    'Promo' as module,
                    (CASE se.offer_type
                        WHEN 'percent_off' THEN '%% OFF'
                        WHEN 'upto_x_percent_off' THEN 'UP TO %% OFF'
                        WHEN 'extra_amount_off' THEN 'AMOUNT OFF'
                        WHEN 'fixed_price' THEN 'FIXED PRICE'
                        ELSE UPPER(REPLACE(se.offer_type, '_', ' '))
                    END)::text AS offer_type,
                    se.offer_x_value::int AS offer_value
                FROM scenario_expanded se
                JOIN promo_metadata pmd
                on se.promo_id = pmd.promo_id and se.scenario_order_id = pmd.scenario_order_id
                -- Dynamic joins based on discount level flags
                %4$s
            ),

            final_data as 
            (SELECT 
                bd.promo_id,
                bd.event_id,
                bd.event_name::TEXT as event_name,
                bd.offer_name::TEXT as offer_name,
                bd.price_start_date,
                bd.price_end_date,
                bd.brand::TEXT as brand,
                bd.productcode::TEXT as productcode,
                bd.brandsku::TEXT as brandsku,
                bd.productprice::NUMERIC as productprice,
                -- Find the nearest acceptable price point
                COALESCE(
                    (SELECT app.price FROM price_promo.tb_acceptable_price_points app
                    WHERE app.l0_cid = bd.l0_cid
                    AND app.price <= bd.raw_price
                    ORDER BY app.price DESC
                    LIMIT 1),
                    bd.raw_price
                ) AS saleprice,
                bd.currency::TEXT as currency,
                bd.user_name::TEXT AS "user",
                bd.user_mail::TEXT as user_mail,
                bd.module::TEXT as module,
                bd.offer_type::TEXT as offer_type,
                bd.offer_value::INT as offer_value
            FROM base_data bd
            ),

            uk_eur_data as
            (
                SELECT 
                bd.promo_id,
                bd.event_id,
                bd.event_name::TEXT as event_name,
                bd.offer_name::TEXT as offer_name,
                bd.price_start_date,
                bd.price_end_date,
                bd.brand::TEXT as brand,
                bd.productcode::TEXT as productcode,
                bd.brandsku::TEXT as brandsku,
                COALESCE(
                    (SELECT app.price FROM price_promo.tb_acceptable_price_points app
                    WHERE app.l0_cid = 5
                    and app.price <= bd.productprice * %5$s
                    ORDER BY app.price DESC
                    LIMIT 1),
                    round(bd.productprice * %5$s, 0)
                ) AS productprice,
                -- Find the nearest acceptable price point
                COALESCE(
                    (SELECT app.price FROM price_promo.tb_acceptable_price_points app
                    WHERE app.l0_cid = 5
                    and app.price <= bd.saleprice * %5$s
                    ORDER BY app.price DESC
                    LIMIT 1),
                    round(bd.saleprice * %5$s, 0)
                ) AS saleprice,
                'EUR'::TEXT as currency,
                bd."user",
                bd.user_mail::TEXT as user_mail,
                bd.module::TEXT as module,
                bd.offer_type::TEXT as offer_type,
                bd.offer_value::INT as offer_value
            FROM final_data bd
            where brand = 'BHUK'
            )
        
        -----Colating final data-----   
        select * from final_data
        union all
        select * from uk_eur_data
        
        ;
        $f$,
        _promo_product_table,            -- %1$s
        _promo_id,                       -- %2$s
        _scenario_order_id,              -- %3$s
        product_join_sql,                -- %4$s
        _forex_multiplier                -- %5$s
        );
        
        -- Log the exact query
        RAISE NOTICE 'SQL: %', dyn_sql;
        RETURN QUERY EXECUTE dyn_sql;
    END;

    $function$
;
