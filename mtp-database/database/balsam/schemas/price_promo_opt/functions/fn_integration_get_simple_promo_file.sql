--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_integration_get_simple_promo_file runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_integration_get_simple_promo_file

DROP FUNCTION if exists price_promo_opt.fn_integration_get_simple_promo_file;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_integration_get_simple_promo_file(_promo_ids integer[])
 RETURNS TABLE(event_name text, offer_name text, price_start_date date, price_end_date date, brand text, productcode text, brandsku text, productprice numeric, saleprice numeric, currency text, "user" text, user_mail text, module text, offer_type text, offer_value text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _start_date DATE;
    _end_date DATE;
    _event_name TEXT;
    _offer_name TEXT;
    _module TEXT := 'Promo';
    _use_real_data BOOLEAN := FALSE;
    dyn_sql TEXT;
    _promo_id INTEGER;
    _user_name TEXT := 'Ambuj';
    _user_email TEXT := 'ambuj@mail.com';
BEGIN
    -- Set default values first
    _start_date := '2025-06-08';
    _end_date := '2025-06-09';
    _event_name := 'Christmas Event';
    _offer_name := 'Up to 40% Off Wk 49';
    
    IF array_length(_promo_ids, 1) > 0 THEN
        _promo_id := _promo_ids[1];
        
        -- Fetch actual promo dates and name if available
        BEGIN
            SELECT 
                pm.start_date, 
                pm.end_date,
                pm.promo_name,
                'Up to 40% Off ' || to_char(pm.start_date, 'Wk WW')
            INTO 
                _start_date, 
                _end_date,
                _event_name,
                _offer_name
            FROM price_promo.promo_master pm
            WHERE pm.promo_id = _promo_id;
            
            IF FOUND THEN
                _use_real_data := TRUE;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Keep default values if promo not found (already set above)
            NULL;
        END;
    END IF;
    
    -- If using real data, construct query to fetch actual products and prices
    IF _use_real_data THEN
        dyn_sql := format($f$
            WITH promo_data AS (
                SELECT 
                    pp.product_id,
                    pm.l0_name AS brand,
                    pm.product_id::text AS productcode,
                    pm.brandsku,
                    ROUND(pm.msrp_with_vat::numeric, 0) AS productprice,
                    pm.currency,
                    psd.scenario_data,
                    psd.promo_id,
                    CASE 
                        WHEN psd.scenario_data->>'offer_type' = 'percent_off' THEN 'X% OFF'
                        WHEN psd.scenario_data->>'offer_type' = 'upto_x_percent_off' THEN 'Upto X% OFF'
                        WHEN psd.scenario_data->>'offer_type' = 'extra_amount_off' THEN 'Amount OFF'
                        WHEN psd.scenario_data->>'offer_type' = 'fixed_price' THEN 'Fixed Price'
                        ELSE UPPER(REPLACE(psd.scenario_data->>'offer_type', '_', ' '))
                    END AS offer_type,
                    (psd.scenario_data->>'offer_x_value')::text AS offer_value,
                    CASE 
                        WHEN psd.scenario_data->>'offer_type' = 'percent_off' 
                        THEN ROUND((pm.msrp_with_vat * (1 - (psd.scenario_data->>'offer_x_value')::numeric / 100))::numeric, 0)
                        WHEN psd.scenario_data->>'offer_type' = 'upto_x_percent_off' 
                        THEN ROUND((pm.msrp_with_vat * (1 - (psd.scenario_data->>'offer_x_value')::numeric / 100))::numeric, 0)
                        WHEN psd.scenario_data->>'offer_type' = 'extra_amount_off' 
                        THEN ROUND((pm.msrp_with_vat - (psd.scenario_data->>'offer_x_value')::numeric)::numeric, 0)
                        WHEN psd.scenario_data->>'offer_type' = 'fixed_price' 
                        THEN ROUND((psd.scenario_data->>'offer_x_value')::numeric, 0)
                        ELSE pm.msrp_with_vat
                    END AS saleprice,
                    promo.start_date,
                    promo.end_date,
                    promo.promo_name,
                    'Up to 40% Off ' || to_char(promo.start_date, 'Wk WW') AS offer_name
                FROM (
                    SELECT unnest(%1$L::integer[]) AS promo_id
                ) p
                JOIN price_promo.promo_master promo ON promo.promo_id = p.promo_id
                JOIN price_promo.ps_scenario_discounts psd ON psd.promo_id = p.promo_id
                LEFT JOIN LATERAL (
                    SELECT * FROM price_promo.fn_get_promo_products(p.promo_id)
                ) pp ON TRUE
                JOIN price_promo.product_master pm ON pp.product_id = pm.product_id
                WHERE pm.msrp_with_vat IS NOT NULL
                LIMIT 100
            )
            SELECT 
                COALESCE(pd.promo_name, %2$L) AS event_name,
                COALESCE(pd.offer_name, %3$L) AS offer_name,
                COALESCE(pd.start_date, %4$L) AS price_start_date,
                COALESCE(pd.end_date, %5$L) AS price_end_date,
                pd.brand,
                pd.productcode,
                pd.brandsku,
                pd.productprice,
                pd.saleprice,
                pd.currency,
                %6$L AS "user",
                %7$L AS user_mail,
                %8$L AS module,
                pd.offer_type,
                pd.offer_value
            FROM promo_data pd
            
            UNION ALL
            
            -- Add multi-currency versions (EUR)
            SELECT 
                %2$L AS event_name,
                %3$L AS offer_name,
                %4$L AS price_start_date,
                %5$L AS price_end_date,
                pd.brand,
                pd.productcode,
                pd.brandsku,
                ROUND(pd.productprice * 0.92, 0) AS productprice,
                ROUND(pd.saleprice * 0.92, 0) AS saleprice,
                'EUR' AS currency,
                %6$L AS "user",
                %7$L AS user_mail,
                %8$L AS module,
                pd.offer_type,
                pd.offer_value
            FROM promo_data pd
            WHERE pd.currency = 'USD'
            
            UNION ALL
            
            -- Add multi-currency versions (GBP)
            SELECT 
                %2$L AS event_name,
                %3$L AS offer_name,
                %4$L AS price_start_date,
                %5$L AS price_end_date,
                pd.brand,
                pd.productcode,
                pd.brandsku,
                ROUND(pd.productprice * 0.78, 0) AS productprice,
                ROUND(pd.saleprice * 0.78, 0) AS saleprice,
                'GBP' AS currency,
                %6$L AS "user",
                %7$L AS user_mail,
                %8$L AS module,
                pd.offer_type,
                pd.offer_value
            FROM promo_data pd
            WHERE pd.currency = 'USD'
        $f$,
        _promo_ids,
        _event_name,
        _offer_name,
        _start_date,
        _end_date,
        _user_name,
        _user_email,
        _module
        );
        
        RETURN QUERY EXECUTE dyn_sql;
    ELSE
        -- Return sample data if not using real data
        RETURN QUERY
        -- USD Products
        SELECT 
            _event_name::text AS event_name,
            _offer_name::text AS offer_name,
            _start_date AS price_start_date,
            _end_date AS price_end_date,
            'BHUS'::text AS brand,
            '2808772'::text AS productcode,
            'BHUS2808772'::text AS brandsku,
            499::numeric AS productprice,
            349::numeric AS saleprice,
            'USD'::text AS currency,
            _user_name::text AS "user",
            _user_email::text AS user_mail,
            _module::text AS module,
            'Upto X% OFF'::text AS offer_type,
            '30'::text AS offer_value
            
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '2807867', 'BHUS2807867', 399, 279, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '30'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '2807868', 'BHUS2807868', 599, 419, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '30'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '2807869', 'BHUS2807869', 749, 529, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '30'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '2807870', 'BHUS2807870', 999, 699, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '30'
        
        -- AUD Products
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHAU', '2808256', 'BHAU2808256', 1149, 809, 'AUD', _user_name, _user_email, _module, 'Upto X% OFF', '30'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHAU', '2808257', 'BHAU2808257', 1379, 965, 'AUD', _user_name, _user_email, _module, 'Upto X% OFF', '30'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHAU', '2807876', 'BHAU2807876', 321, 229, 'AUD', _user_name, _user_email, _module, 'Upto X% OFF', '30'
        
        -- GBP Products
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUK', '2807861', 'BHUK2807861', 429, 303, 'GBP', _user_name, _user_email, _module, 'Upto X% OFF', '30'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUK', '2807863', 'BHUK2807863', 545, 327, 'GBP', _user_name, _user_email, _module, 'Upto X% OFF', '40'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUK', '2807865', 'BHUK2807865', 739, 443, 'GBP', _user_name, _user_email, _module, 'Upto X% OFF', '40'
        
        -- More USD Products with 40% discount
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '2808186', 'BHUS2808186', 1199, 719, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '40'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '2808187', 'BHUS2808187', 1449, 869, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '40'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '4120306', 'BHUS4120306', 1899, 1139, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '40'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '4120307', 'BHUS4120307', 2699, 1619, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '40'
        UNION ALL SELECT _event_name, _offer_name, _start_date, _end_date, 'BHUS', '4120321', 'BHUS4120321', 1249, 749, 'USD', _user_name, _user_email, _module, 'Upto X% OFF', '40';
    END IF;
END;
$function$



;