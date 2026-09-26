--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_fetch_products_for_promo_v6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_fetch_products_for_promo


DROP FUNCTION IF EXISTS price_promo.fn_fetch_products_for_promo;

CREATE OR REPLACE FUNCTION price_promo.fn_fetch_products_for_promo(p_promo_id integer)
 RETURNS TABLE(promo_id integer, product_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE

BEGIN
	RETURN QUERY EXECUTE '
            SELECT
                $1 as promo_id,
                pp.product_id::INT
            FROM
                price_promo.promo_product_' || p_promo_id || ' pp
            WHERE
                pp.promo_id = $1'
        USING p_promo_id;
END;
$function$
;
