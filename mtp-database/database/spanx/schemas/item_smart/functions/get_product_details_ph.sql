--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:get_product_details_ph stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit-4
--comment: initial changeset for get_product_details_ph-4
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_product_details_ph(product_codes text[]);
CREATE OR REPLACE FUNCTION item_smart.get_product_details_ph(product_codes text[])
 RETURNS TABLE(product_code text, item_description text, product_type text, back_type text, back_type_name text, bust_type text, bust_type_name text, closure_type text, color text, cost numeric, coverage_bra text, coverage_bra_name text, fit text, fit_name text, height text, height_name text, impact_level text, impact_level_name text, inseam text, inseam_name text, length_description text, length_description_name text, lining_bra text, lining_bra_name text, longline_bra text, neckline text, neckline_name text, pocket_quantity text, price numeric, product_details_en_us text, sheerness text, sheerness_name text, silhouette_name text, sleeve_length text, sleeve_length_name text, strap_type text, strap_type_name text, wash text, wash_name text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        mphf.product_code::TEXT,
        mphf.item_description::TEXT,
        mphf.product_type::TEXT,
        mphf.back_type::TEXT,
        mphf.back_type_name::TEXT,
        mphf.bust_type::TEXT,
        mphf.bust_type_name::TEXT,
        mphf.closure_type::TEXT,
        mphf.color::TEXT,
        mphf.cost::NUMERIC,
        mphf.coverage_bra::TEXT,
        mphf.coverage_bra_name::TEXT,
        mphf.fit::TEXT,
        mphf.fit_name::TEXT,
        mphf.height::TEXT,
        mphf.height_name::TEXT,
        mphf.impact_level::TEXT,
        mphf.impact_level_name::TEXT,
        mphf.inseam::TEXT,
        mphf.inseam_name::TEXT,
        mphf.length_description::TEXT,
        mphf.length_description_name::TEXT,
        mphf.lining_bra::TEXT,
        mphf.lining_bra_name::TEXT,
        mphf.longline_bra::TEXT,
        mphf.neckline::TEXT,
        mphf.neckline_name::TEXT,
        mphf.pocket_quantity::TEXT,
        mphf.price::NUMERIC,
        mphf.product_details_en_us::TEXT,
        mphf.sheerness::TEXT,
        mphf.sheerness_name::TEXT,
        mphf.silhouette_name::TEXT,
        mphf.sleeve_length::TEXT,
        mphf.sleeve_length_name::TEXT,
        mphf.strap_type::TEXT,
        mphf.strap_type_name::TEXT,
        mphf.wash::TEXT,
        mphf.wash_name::TEXT
    FROM item_smart.mv_product_hierarchies_filter mphf
    WHERE mphf.product_code = ANY(product_codes);
END;
$function$
;