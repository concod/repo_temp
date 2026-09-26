--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:ph-new-sku runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit_ph-new-sku
--comment: initial changeset for ph-new-sku
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.get_product_details_ph(_text);

CREATE OR REPLACE FUNCTION item_smart.get_product_details_ph(product_codes text[])
 RETURNS TABLE(product_code text, style_description text, product_type text, season text, class text, collection text, gender text, leg_length_dsc text, leg_type text, size text, sleeve_length_dsc text, sleeve_type text, sty_primary_occsn_end_use_dsc text, age text, sty_primary_color_fam_cd text, sty_print_pattern_cd text, price numeric, cost numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        mphf.style::TEXT as product_code,  -- Fetch from 'style' but display as 'product_code'
        mphf.style_description::TEXT,
        mphf.product_type::TEXT,
        mphf.season::TEXT,
        mphf.class::TEXT,
        mphf.collection::TEXT,
        mphf.gender::TEXT,
        mphf.leg_length_dsc::TEXT,
        mphf.leg_type::TEXT,
        mphf.size::TEXT,
        mphf.sleeve_length_dsc::TEXT,
        mphf.sleeve_type::TEXT,
        mphf.sty_primary_occsn_end_use_dsc::TEXT,
        mphf.age::TEXT,
        mphf.sty_primary_color_fam_cd::TEXT,
        mphf.sty_print_pattern_cd::TEXT,
        mphf.price::NUMERIC,
        mphf.cost::NUMERIC
    FROM item_smart.mv_product_hierarchies_filter mphf
    WHERE mphf.style = ANY(product_codes);  -- Keep WHERE clause using 'style'
END;
$function$
;
