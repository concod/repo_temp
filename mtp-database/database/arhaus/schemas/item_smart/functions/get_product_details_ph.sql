--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:get_new_skus stripComments:false runOnChange:true splitStatements:false context:query_updated labels:get_product_details_ph
--comment: initial changeset for get_product_details_ph
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_product_details_ph(product_codes text[]);

CREATE OR REPLACE FUNCTION item_smart.get_product_details_ph(product_codes text[])
 RETURNS TABLE(product_code text, product_description text, product_type text, collection_name text, aesthetic text, color text, finish text, form text, comfort text, covering text, function text, lifestyle text, shape text, type text, price numeric, cost numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        mphf.product_code::TEXT,
        mphf.product_description::TEXT,
        mphf.product_type::TEXT,
        mphf.collection_name::TEXT,
        mphf.aesthetic::TEXT,
        mphf.color::TEXT,
        mphf.finish::TEXT,
        mphf.form::TEXT,
        mphf.comfort::TEXT,
        mphf.covering::TEXT,
        mphf.function::TEXT,
        mphf.lifestyle::TEXT,
        mphf.shape::TEXT,
        mphf.type::TEXT,
        mphf.retail_price::NUMERIC as price,
        mphf.replacement_cost::NUMERIC as cost
    FROM item_smart.mv_product_hierarchies_filter mphf
    WHERE mphf.product_code = ANY(product_codes);
END;
$function$
;