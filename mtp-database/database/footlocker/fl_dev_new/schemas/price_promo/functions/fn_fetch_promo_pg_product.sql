--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_fetch_promo_pg_product runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_fetch_promo_pg_product


-- DROP FUNCTION price_promo.fn_fetch_promo_pg_product(int4, bool);
DROP FUNCTION IF EXISTS price_promo.fn_fetch_promo_pg_product();

CREATE OR REPLACE FUNCTION price_promo.fn_fetch_promo_pg_product(_promo_id integer, _run_condition boolean DEFAULT true)
 RETURNS TABLE(pg_id integer, product_id integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT a.pg_id::INT as pg_id, a.product_id::INT as product_id
    FROM "global".tb_pg_product a
    WHERE
      _run_condition
      AND a.pg_id IN (
        SELECT DISTINCT product_group_id
        FROM price_promo.tb_promo_product_groups
        WHERE promo_id = _promo_id
      );
END;
$function$
;
