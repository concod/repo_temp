--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:get_product_details_ph stripComments:false runOnChange:true splitStatements:false context:new_product_details_ph labels:itemsmart_initial_commit-1
--comment: initial changeset for get_product_details_ph-1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_product_details_ph(text[]);

CREATE OR REPLACE FUNCTION item_smart.get_product_details_ph(product_codes text[])
 RETURNS TABLE(
    product_code text, 
    product_description text, 
    product_type text, 
    color text, 
    colour_char_name text,
    colour_internal_char text,
    cost numeric, 
    generic_article_id text,
    generic_article_name text,
    info_capacity text,
    price numeric,
    vendor_id text,
    vendor_name text,
    product_name text
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        mphf.product_code::TEXT,
        mphf.product_description::TEXT,
        mphf.product_type::TEXT,
        mphf.color::TEXT,
        mphf.colour_char_name::TEXT,
        mphf.colour_internal_char::TEXT,
        mphf.cost::NUMERIC,
        mphf.generic_article_id::TEXT,
        mphf.generic_article_name::TEXT,
        mphf.info_capacity::TEXT,
        mphf.price::NUMERIC,
        mphf.vendor_id::TEXT,
        mphf.vendor_name::TEXT,
        mphf.product_name::TEXT
    FROM item_smart.mv_product_hierarchies_filter mphf
    WHERE mphf.product_code = ANY(product_codes);
END;
$function$
;