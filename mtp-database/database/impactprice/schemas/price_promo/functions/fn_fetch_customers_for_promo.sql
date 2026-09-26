--liquibase formatted sql
--changeset divyasree.bingimalla@impactanalytics.co:fn_fetch_customers_for_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Function to get customer data

DROP FUNCTION IF EXISTS price_promo.fn_fetch_customers_for_promo();

CREATE OR REPLACE FUNCTION price_promo.fn_fetch_customers_for_promo(in_promo_id integer)
 RETURNS TABLE(promo_id integer, customer_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _customer_type INT;
BEGIN
    -- Get the customer_type from promo_master
    SELECT pm.customer_type
    INTO _customer_type
    FROM price_promo.promo_master pm
    WHERE pm.promo_id = in_promo_id
    LIMIT 1;

    -- Handle invalid or missing selection type
    IF _customer_type IS NULL THEN
        RAISE NOTICE 'No customer selection type found for Promo ID %', in_promo_id;
        RETURN QUERY
        SELECT NULL::INT AS promo_id, NULL::INT AS customer_id LIMIT 0;

    ELSIF _customer_type NOT IN (1, 2, 3, 4, 5, 6, 7) THEN
        RAISE NOTICE 'Promo ID % does not have a valid customer selection type', in_promo_id;
        RETURN QUERY
        SELECT in_promo_id::INT AS promo_id, NULL::INT AS customer_id LIMIT 0;

    -- Conditional logic based on customer_type
    ELSIF _customer_type = 1 THEN
        -- Fetch all customers (no is_active filter)
        RETURN QUERY
        SELECT
            in_promo_id::INT AS promo_id,
            cm.customer_id::INT AS customer_id
        FROM pricesmart.customer_master cm;

    ELSIF _customer_type IN (2, 3) THEN
        -- Filter by segment only (no is_active filter)
        RETURN QUERY EXECUTE '
            SELECT
                $1::INT AS promo_id,
                cm.customer_id::INT AS customer_id
            FROM pricesmart.customer_master cm
            WHERE cm.segment_id = CASE $2
                    WHEN 2 THEN 2
                    WHEN 3 THEN 1
                    ELSE NULL
                END'
        USING in_promo_id, _customer_type;

    ELSIF _customer_type IN (4, 5, 6) THEN
        -- Fetch from promo_customer partitioned table
        RETURN QUERY EXECUTE '
            SELECT
                $1::INT AS promo_id,
                pc.customer_id::INT AS customer_id
            FROM price_promo.promo_customer_' || in_promo_id || ' pc
            WHERE pc.promo_id = $1'
        USING in_promo_id;

    ELSIF _customer_type = 7 THEN
        -- Same as above, reserved for special handling
        RETURN QUERY EXECUTE '
            SELECT
                $1::INT AS promo_id,
                pc.customer_id::INT AS customer_id
            FROM price_promo.promo_customer_' || in_promo_id || ' pc
            WHERE pc.promo_id = $1'
        USING in_promo_id;
    END IF;

END;
$function$
;
