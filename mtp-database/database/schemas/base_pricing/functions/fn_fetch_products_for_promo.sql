--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_fetch_products_for_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_fetch_products_for_promo


-- DROP FUNCTION base_pricing.fn_fetch_products_for_promo(int4, _int4);
DROP FUNCTION IF EXISTS base_pricing.fn_fetch_products_for_promo();

CREATE OR REPLACE FUNCTION base_pricing.fn_fetch_products_for_promo(p_promo_id integer, _active integer[] DEFAULT ARRAY[1])
 RETURNS TABLE(promo_id integer, product_id integer, product_name text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _product_selection_type INT;
BEGIN
    -- Get the product_selection_type
    SELECT pm.product_selection_type
    INTO _product_selection_type
    FROM base_pricing.promo_master pm
    WHERE pm.promo_id = p_promo_id
    LIMIT 1;

    -- Check if product_selection_type is valid
    IF _product_selection_type IS NULL THEN
        RAISE EXCEPTION 'No product selection type found for Promo ID %', p_promo_id;
    ELSIF _product_selection_type NOT IN (1, 2, 3, 4, 5, 6, 7) THEN
        RAISE EXCEPTION 'Promo ID % does not have a valid product selection type', p_promo_id;
    END IF;
    
    -- Conditional logic based on product_selection_type
    IF _product_selection_type = 1 THEN
        RETURN QUERY
        SELECT
            p_promo_id as promo_id,
            pm.product_id::INT, 
            pm.product_name::TEXT
        FROM 
            base_pricing.product_master pm
        WHERE 
            pm.is_active = ANY(_active);
        
    ELSIF _product_selection_type IN (2, 4, 5, 6) THEN
        -- Fetch from the promo_product partitioned table using EXECUTE with USING
        RETURN QUERY EXECUTE '
            SELECT
                $1 as promo_id,
                pp.product_id::INT,
                pp.product_name::TEXT
            FROM
                base_pricing.promo_product_' || p_promo_id || ' pp
            WHERE
                pp.promo_id = $1 and pp.product_id in (select pm.product_id 
from base_pricing.product_master pm where pm.is_active = ANY($2))'
        USING p_promo_id,_active::int[];
    
    ELSIF _product_selection_type IN (3, 7) THEN
        -- Fetch from the promo_product partitioned table using EXECUTE with USING
        RETURN QUERY EXECUTE '
            SELECT
                $1 as promo_id,
                pp.product_id::INT,
                pp.product_name::TEXT
            FROM
                base_pricing.promo_product_' || p_promo_id || ' pp
            WHERE
                pp.promo_id = $1 and pp.product_id in (select pm.product_id 
from base_pricing.product_master pm where pm.is_active = ANY($2))'
        USING p_promo_id, _active::int[];
    END IF;
END;
$function$
;
