--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:get_product_details_ph_new stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit-4
--comment: updated changeset for get_product_details_ph with new client attributes

DROP FUNCTION IF EXISTS item_smart.get_product_details_ph(product_codes text[]);
CREATE OR REPLACE FUNCTION item_smart.get_product_details_ph(product_codes text[])
 RETURNS TABLE(
    product_code text,
    product_description text,
    product_type text,
    color text,
    size text,
    tree_shape text,
    light_type text,
    size_set_pack text,
    print_catalog text,
    drop_ship text,
    channel_status text,
    vendor text,
    country_of_origin text
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
        mphf.size::TEXT,
        mphf.tree_shape::TEXT,
        mphf.light_type::TEXT,
        mphf.size_set_pack::TEXT,
        mphf.print_catalog::TEXT,
        mphf.drop_ship::TEXT,
        mphf.channel_status::TEXT,
        mphf.vendor::TEXT,
        mphf.country_of_origin::TEXT
    FROM item_smart.mv_product_hierarchies_filter mphf
    WHERE mphf.product_code = ANY(product_codes);
END;
$function$
;
