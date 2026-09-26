--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:fn_reporting_get_products_06082025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_reporting_get_products

DROP FUNCTION IF EXISTS price_markdown_opt.fn_reporting_get_products;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_reporting_get_products(_l0_cid integer[], _l1_cid integer[], _l2_cid integer[], _l3_cid integer[], _l4_cid integer[], _l5_cid integer[], _l6_cid integer[])
 RETURNS TABLE(l0_id text, l0_name text, l1_id text, l1_name text, l2_id text, l2_name text, l3_id text, l3_name text, l4_id text, l4_name text, l5_id text, l5_name text, l6_id text, l6_name text, product_id bigint, cost double precision, age_bucket text, msrp double precision, current_price double precision, lifecycle_indicator text, product_description text, currency_id integer, clearance_indicator integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        pm.l0_id::text, pm.l0_name::text,
        pm.l1_id::text, pm.l1_name::text,
        pm.l2_id::text, pm.l2_name::text,
        pm.l3_id::text, pm.l3_name::text,
        pm.l4_id::text, pm.l4_name::text,
        pm.l5_id::text, pm.l5_name::text,
        pm.l6_id::text, pm.l6_name::text,
        pm.product_id::bigint,
        pm.cost::double precision, 
        pm.age_month_bucket as age_bucket,
        pm.msrp_with_vat::double precision,
        pm.current_price_with_vat::double precision,
        pm.derived_status as lifecycle_indicator,
        pm.product_name as product_description,
        pm.currency_id :: int, pm.clearance_indicator::int
    FROM price_markdown.product_master pm
    WHERE pm.is_active = 1
    AND (
        (_l0_cid IS NULL OR pm.l0_cid = ANY(_l0_cid))
        AND (_l1_cid IS NULL OR pm.l1_cid = ANY(_l1_cid))
        AND (_l2_cid IS NULL OR pm.l2_cid = ANY(_l2_cid))
        AND (_l3_cid IS NULL OR pm.l3_cid = ANY(_l3_cid))
        AND (_l4_cid IS NULL OR pm.l4_cid = ANY(_l4_cid))
        AND (_l5_cid IS NULL OR pm.l5_cid = ANY(_l5_cid))
        AND (_l6_cid IS NULL OR pm.l6_cid = ANY(_l6_cid))
    );
END;
$function$
;