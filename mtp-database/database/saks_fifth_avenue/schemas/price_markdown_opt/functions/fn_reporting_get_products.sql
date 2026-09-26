--liquibase formatted sql
--changeset liquibase:fn_reporting_get_products_v200924 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_get_products

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_get_products;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_get_products(_l0_cid integer[], _l1_cid integer[], _l2_cid integer[], _l3_cid integer[], _l4_cid integer[])
 RETURNS TABLE(l0_id text, l0_name text, l1_id text, l1_name text, l2_id text, l2_name text, l3_id text, l3_name text, l4_id text, l4_name text, l5_id text, style_id text, product_id bigint, fob text, cost double precision, age_bucket text, mfg_no text, mfg_name text, msrp double precision, lifecycle_indicator text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        pm.l0_id, pm.l0_name,
        pm.l1_id, pm.l1_name,
        pm.l2_id, pm.l2_name,
        pm.l3_id, pm.l3_name,
        pm.l4_id, pm.l4_name,
        pm.l5_id, pm.style_id, pm.product_id, pm.fob,
        pm.cost, pm.age_month_bucket as age_bucket,
        pm.mfg_no, pm.mfg_name, pm.msrp, pm.lifecycle_indicator
    FROM price_markdown.product_master pm
    WHERE pm.is_active = 1
    AND (
        (_l0_cid IS NULL OR pm.l0_cid = ANY(_l0_cid))
        AND (_l1_cid IS NULL OR pm.l1_cid = ANY(_l1_cid))
        AND (_l2_cid IS NULL OR pm.l2_cid = ANY(_l2_cid))
        AND (_l3_cid IS NULL OR pm.l3_cid = ANY(_l3_cid))
        AND (_l4_cid IS NULL OR pm.l4_cid = ANY(_l4_cid))
    );
END;
$function$
;