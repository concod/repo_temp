--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_reporting_get_products runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_reporting_get_products
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_reporting_get_products;
CREATE OR REPLACE FUNCTION price_markdown.fn_reporting_get_products(_product_h1_id integer[], _product_h2_id integer[], _product_h3_id integer[], _product_h4_id integer[], _product_h5_id integer[])
 RETURNS TABLE(product_h1_id integer, product_h1_name character varying, product_h2_id integer, product_h2_name character varying, product_h3_id integer, product_h3_name character varying, product_h4_id integer, product_h4_name character varying, product_id bigint, product_name character varying, price double precision, cost double precision, comp_value double precision, brand_id bigint, brand character varying, client_classid integer, client_subclassid integer, web_designation_cd smallint, store_pickup_eligible_ind smallint, available_on_line_ind smallint, image_exists smallint)
	LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pm.product_h1_id, pm.product_h1_name, 
        pm.product_h2_id, pm.product_h2_name, 
        pm.product_h3_id, pm.product_h3_name, 
        pm.product_h4_id, pm.product_h4_name,
        pm.product_id, pm.product_name,
        pm.price, pm.cost, pm.comp_value,
        pm.brand_id, pm.brand,
        pm.client_classid, pm.client_subclassid,
        pm.web_designation_cd, pm.store_pickup_eligible_ind,
        pm.available_on_line_ind, pm.image_exists
    FROM price_markdown.product_master pm
    WHERE pm.is_active = 1
    AND (
        (_product_h1_id IS NULL OR pm.product_h1_id = ANY(_product_h1_id))
        AND (_product_h2_id IS NULL OR pm.product_h2_id = ANY(_product_h2_id))
        AND (_product_h3_id IS NULL OR pm.product_h3_id = ANY(_product_h3_id))
        AND (_product_h4_id IS NULL OR pm.product_h4_id = ANY(_product_h4_id))
        AND (_product_h5_id IS NULL OR pm.product_id = ANY(_product_h5_id))
    );
END;
$function$
;