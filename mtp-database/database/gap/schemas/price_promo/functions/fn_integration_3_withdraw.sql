--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:integration_withdraw_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:integration
--comment: Function to retrieve promotion withdrawal data with original prices

DROP FUNCTION IF EXISTS price_promo.fn_integration_3_withdraw;

CREATE OR REPLACE FUNCTION price_promo.fn_integration_3_withdraw(
    _promo_ids INTEGER[]
)
RETURNS TABLE(
    promo_id INTEGER,
    event_id INTEGER,
    event_name TEXT,
    offer_name TEXT,
    price_start_date DATE,
    price_end_date DATE,
    brand TEXT,
    productcode TEXT,
    brandsku TEXT,
    productprice NUMERIC,
    saleprice NUMERIC,
    currency TEXT,
    "user" TEXT,
    user_mail TEXT,
    module TEXT,
    offer_type TEXT,
    offer_value INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
    /*
    Purpose: Retrieves promotion withdrawal data with original prices (no discounts) for an array of promotion IDs.
    
    Example: SELECT * FROM price_promo.fn_integration_3_withdraw(ARRAY[123, 124], 1);
    
    Other Functions Used: None
    
    Tables Used:
    - price_promo.promo_master: For promotion details
    - price_promo.event_master: For event information
    - price_promo.promo_product: For product associations
    - price_promo.product_master: For product details
    - price_promo.tb_acceptable_price_points: For price point mapping
    - global.user_master: For user information
    - global.planned_forex_rate: For currency conversion rates
    
    Returns: Table with promotion data including original prices (no discounts) for withdrawal
    */
DECLARE
    _forex_multiplier FLOAT := 1.17; -- Default forex multiplier for GBP to EUR
    dyn_sql TEXT;
BEGIN
    -- Construct the dynamic SQL query
    dyn_sql := format($f$
    WITH base_data AS (
        SELECT
            pm.promo_id,
            em.event_id,
            em.name AS event_name,
            pm.name AS offer_name,
            pm.start_date AS price_start_date,
            pm.end_date AS price_end_date,
            prd.l0_cid,
            prd.l0_name AS brand,
            prd.l6_name AS productcode,
            prd.brandsku,
            ROUND(prd.msrp_with_vat::numeric, 2) AS productprice,
            ROUND(prd.msrp_with_vat::numeric, 2) AS raw_price, -- Same as productprice for withdrawals
            prd.currency,
            prd.currency_id,
            um.name AS user_name,
            um.email AS user_mail,
            'Promo' AS module,
            'WITHDRAW' AS offer_type,
            0 AS offer_value
        FROM
            price_promo.promo_master pm
        JOIN
            price_promo.event_master em ON pm.event_id = em.event_id
        JOIN
            price_promo.promo_product pp ON pm.promo_id = pp.promo_id
        JOIN
            price_promo.product_master prd ON pp.product_id = prd.product_id
        JOIN
            "global".user_master um on um.user_code = pm.created_by
        WHERE
            pm.promo_id = ANY(ARRAY[%1$s])
            and msrp_with_vat is not null
    ),
    
    final_data AS (
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
            bd.productprice::NUMERIC as productprice,
            bd.raw_price AS saleprice, -- No discount for withdrawals
            bd.currency::TEXT as currency,
            bd.user_name::TEXT AS "user",
            bd.user_mail::TEXT as user_mail,
            bd.module::TEXT as module,
            bd.offer_type::TEXT as offer_type,
            bd.offer_value::INT as offer_value
        FROM base_data bd
    ),

    uk_eur_data AS (
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
                ORDER BY ABS(app.price - bd.productprice * %2$s) ASC
                LIMIT 1),
                round(bd.productprice * %2$s, 0)
            ) AS productprice,
            -- Same price for saleprice in withdrawals
            COALESCE(
                (SELECT app.price FROM price_promo.tb_acceptable_price_points app
                WHERE app.l0_cid = 5
                ORDER BY ABS(app.price - bd.saleprice * %2$s) ASC
                LIMIT 1),
                round(bd.saleprice * %2$s, 0)
            ) AS saleprice,
            'EUR'::TEXT as currency,
            bd."user",
            bd.user_mail::TEXT as user_mail,
            bd.module::TEXT as module,
            bd.offer_type::TEXT as offer_type,
            bd.offer_value::INT as offer_value
        FROM final_data bd
        WHERE brand = 'BHUK'
    )
    
    -- Combine regular data with UK/EUR converted data
    SELECT * FROM final_data
    UNION ALL
    SELECT * FROM uk_eur_data
    $f$,
    array_to_string(_promo_ids, ','),  -- %1$s
    _forex_multiplier                  -- %2$s
    );
    
    -- Log the exact query
    RAISE NOTICE 'SQL: %', dyn_sql;
    RETURN QUERY EXECUTE dyn_sql;
END;
$function$;
