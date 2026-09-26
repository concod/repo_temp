--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_update_competitor_buckets_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_update_competitor_buckets_v4

DROP PROCEDURE IF EXISTS base_pricing.sp_update_competitor_buckets_v4;

CREATE OR REPLACE PROCEDURE base_pricing.sp_update_competitor_buckets_v4()
 LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Update V4 table with bucket info and mode ('average' if 2+ competitors)
    UPDATE base_pricing.bp_product_store_attributes_mapping_v4 AS mapping
    SET 
        primary_bucket    = COALESCE(buckets.primary_competitors, '{}'),
        primary_mode      = buckets.primary_mode,
        secondary_bucket  = COALESCE(buckets.secondary_competitors, '{}'),
        secondary_mode    = buckets.secondary_mode,
        tertiary_bucket   = COALESCE(buckets.tertiary_competitors, '{}'),
        tertiary_mode     = buckets.tertiary_mode,
        quaternary_bucket = COALESCE(buckets.quaternary_competitors, '{}'),
        quaternary_mode   = buckets.quaternary_mode
    FROM (
        SELECT cm.product_id,
               cm.s0_cid AS channel_id,
               
               ARRAY_AGG(DISTINCT meta.frontend_display_name) FILTER (WHERE bc.bucket_name='primary') AS primary_competitors,
               CASE WHEN COUNT(*) FILTER (WHERE bc.bucket_name='primary') > 1 THEN 'Average' ELSE NULL END AS primary_mode,
               
               ARRAY_AGG(DISTINCT meta.frontend_display_name) FILTER (WHERE bc.bucket_name='secondary') AS secondary_competitors,
               CASE WHEN COUNT(*) FILTER (WHERE bc.bucket_name='secondary') > 1 THEN 'Average' ELSE NULL END AS secondary_mode,
               
               ARRAY_AGG(DISTINCT meta.frontend_display_name) FILTER (WHERE bc.bucket_name='tertiary') AS tertiary_competitors,
               CASE WHEN COUNT(*) FILTER (WHERE bc.bucket_name='tertiary') > 1 THEN 'Average' ELSE NULL END AS tertiary_mode,
               
               ARRAY_AGG(DISTINCT meta.frontend_display_name) FILTER (WHERE bc.bucket_name='quaternary') AS quaternary_competitors,
               CASE WHEN COUNT(*) FILTER (WHERE bc.bucket_name='quaternary') > 1 THEN 'Average' ELSE NULL END AS quaternary_mode
        FROM base_pricing.bp_competitor_mapping AS cm
        JOIN base_pricing.bp_bucket_config AS bc ON cm.bucket_id = bc.bucket_id
        JOIN base_pricing.bp_competitor_attributes_metadata AS meta ON cm.competitor_id = meta.attribute_id
        GROUP BY cm.product_id, cm.s0_cid
    ) AS buckets
    WHERE mapping.product_id = buckets.product_id
      AND mapping.channel_id = buckets.channel_id
      AND mapping.segment_id = 10001;
END;
$procedure$
;
