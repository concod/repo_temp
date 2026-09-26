
--liquibase formatted sql
--changeset liquibase:ada_visual_predictions_lookup runOnChange:true stripComments:false splitStatements:false context:packs_update labels:MTP-17777
--comment: initial changeset for ada_visual_predictions_lookup

DROP VIEW IF EXISTS cache.ada_visual_predictions_lookup;

CREATE OR REPLACE VIEW cache.ada_visual_predictions_lookup AS
SELECT DISTINCT
    1 AS common,
    fw.fiscal_year_week,
    paf.product_code,
    paf.article,
    paf.l0_id,
    paf.l1_name,
    paf.l2_id,
    paf.l2_name,
    paf.l3_id,
    paf.l3_name,
    paf.l4_id,
    paf.l4_name,
    paf.l5_id,
    paf.l5_name,
    paf.l6_id,
    paf.l6_name,
    paf.l7_id,
    paf.l7_name,
    paf.l8_id,
    paf.l8_name,
    paf.color_code,
    paf.color_description,
    paf.color_family,
    paf.original_price,
    paf.active,
    paf.product_description,
    paf.product_name,
    paf.product_line,
    paf.product_bucket_code,
    paf.launch_date,
    paf.season_code,
    paf.silhouette,
    paf.planning_product_grouping,
    paf.gender,
    paf.flex_status,
    paf.global_merch_team,
    paf.fit_classification,
    paf.design_line,
    paf.designed_for_activity,
    paf.size_scale,
    paf.product_development_pod,
    paf.product_size_definition,
    paf.global_line_segment_style_category,
    paf.created_at,
    paf.updated_at,
    paf.created_by,
    paf.updated_by,
    paf.is_deleted,
    paf.cost,
    paf.replacement_product_codes,
    paf.price,
    paf.receipt_date,
    paf.clearance,
    paf.reference_product_codes,
    paf.article_original,
    paf.product_code_original,
    paf.rcl_hash,
    paf.size,
    paf.article_status
FROM (
    SELECT DISTINCT fdm.fiscal_year_week
    FROM global.fiscal_date_mapping fdm
    WHERE fdm.date >= NOW()
      AND fdm.date <= (NOW() + INTERVAL '1 year')
) AS fw,

global.product_attributes_filter AS paf;

--changeset liquibase:ada_visual_predictions_lookup_1 runOnChange:true stripComments:false splitStatements:false context:packs_update labels:MTP-17777
--comment: initial changeset for ada_visual_predictions_lookup_1

DROP VIEW IF EXISTS cache.ada_visual_predictions_lookup;

CREATE OR REPLACE VIEW "cache".ada_visual_predictions_lookup
AS SELECT 1 AS common,
    fw.fiscal_year_week,
    paf.product_code,
    paf.article,
    paf.l0_id,
    paf.l1_name,
    paf.l2_id,
    paf.l2_name,
    paf.l3_id,
    paf.l3_name,
    paf.l4_id,
    paf.l4_name,
    paf.l5_id,
    paf.l5_name,
    paf.l6_id,
    paf.l6_name,
    paf.l7_id,
    paf.l7_name,
    paf.l8_id,
    paf.l8_name,
    paf.color_code,
    paf.color_description,
    paf.color_family,
    paf.original_price,
    paf.active,
    paf.product_description,
    paf.product_name,
    paf.product_line,
    paf.product_bucket_code,
    paf.launch_date,
    paf.season_code,
    paf.silhouette,
    paf.planning_product_grouping,
    paf.gender,
    paf.flex_status,
    paf.global_merch_team,
    paf.fit_classification,
    paf.design_line,
    paf.designed_for_activity,
    paf.size_scale,
    paf.product_development_pod,
    paf.product_size_definition,
    paf.global_line_segment_style_category,
    paf.created_at,
    paf.updated_at,
    paf.created_by,
    paf.updated_by,
    paf.is_deleted,
    paf.cost,
    paf.replacement_product_codes,
    paf.price,
    paf.receipt_date,
    paf.clearance,
    paf.reference_product_codes,
    paf.article_original,
    paf.product_code_original,
    paf.rcl_hash,
    paf.size,
    paf.article_status
   FROM ( SELECT fdm.fiscal_year_week
           FROM global.fiscal_date_mapping fdm
          WHERE fdm.date >= now() AND fdm.date <= (now() + '1 year'::interval)
          GROUP BY fdm.fiscal_year_week) fw
     CROSS JOIN global.product_attributes_filter paf;