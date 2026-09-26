--liquibase formatted sql
--changeset liquibase:aggregation_level_filter3 runOnChange:true stripComments:false splitStatements:false context:packs_update labels:MTP-17777
--comment: initial changeset for  aggregation_level_filter3

DROP MATERIALIZED VIEW IF EXISTS "global".aggregation_level_filter CASCADE;

CREATE MATERIALIZED VIEW "global".aggregation_level_filter
AS 
SELECT article AS aggregation_code,
    products,
    product_description,
    article_description,
    global_fit_platform,
    article,
    display_article,
    l0_name,
    l1_name,
    l2_name,
    l3_name,
    l4_name,
    l5_name,
    l6_name,
    l7_name,
    l7_code,
    color_code,
    color_description,
    color_family,
    product_code_original,
    article_original
   FROM ( SELECT pa.article AS aggregation_code,
            pa.article,
            pa.article_original,
            array_agg(pa.product_code) AS products,
            max(pa.product_description) AS product_description,
            max(pa.l8_name::text) AS article_description,
            max(NULL::text) AS global_fit_platform,
            pa.article_original AS display_article,
            pa.l0_name,
            pa.l1_name,
            pa.l2_name,
            pa.l3_name,
            max(pa.l4_name::text) AS l4_name,
            max(pa.l5_name::text) AS l5_name,
            max(pa.l6_name::text) AS l6_name,
            max(pa.l7_name::text) AS l7_name,
            max(pa.l7_id::text) AS l7_code,
            max(pa.color_code::text) AS color_code,
            max(pa.color_description::text) AS color_description,
            max(pa.color_family::text) AS color_family,
            array_agg(pa.product_code_original) AS product_code_original
           FROM global.product_attributes_filter pa
          WHERE pa.is_deleted IS FALSE
          GROUP BY pa.article, pa.l0_name, pa.l1_name, pa.l2_name, pa.l3_name, pa.article_original) grouped_data
WITH DATA;

-- View indexes:
CREATE UNIQUE INDEX aggregation_level_filter_unique_idx ON global.aggregation_level_filter USING btree (aggregation_code, l1_name, l2_name, l3_name, l4_name);