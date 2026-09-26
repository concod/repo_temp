--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:aggregation_level_filter_02 stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:New_Approach_of_MV
--comment: initial changeset for aggregation_level_filter_02

CREATE MATERIALIZED VIEW "global".aggregation_level_filter
TABLESPACE pg_default
AS SELECT grouped_data.article AS aggregation_code,
    grouped_data.article,
    grouped_data.product_description,
    grouped_data.brand,
    grouped_data.product_code AS products,
    grouped_data.l0_name,
    grouped_data.l1_name,
    grouped_data.l2_name,
    grouped_data.l3_name,
    grouped_data.l4_name,
    grouped_data.l5_name,
    grouped_data.l5_id,
    grouped_data.color,
    grouped_data.color_name,
    grouped_data.product_life_cycle,
    grouped_data.style_color_id,
    grouped_data.size_name,
    grouped_data.season_code,
    grouped_data.clearance_start_date,
    grouped_data.launch_date,
    grouped_data.collection,
    grouped_data.brand_level,
    grouped_data.exit_date
   FROM ( SELECT pa.article AS aggregation_code,
            pa.article,
            max(pa.product_description) AS product_description,
            max(pa.brand::text) AS brand,
            array_agg(pa.product_code) AS product_code,
            pa.l0_name,
            pa.l1_name,
            pa.l2_name,
            pa.l3_name,
            pa.l5_id,
            max(pa.l4_name::text) AS l4_name,
            max(pa.l5_name::text) AS l5_name,
            max(pa.color::text) AS color,
            max(pa.color_name::text) AS color_name,
            max(pa.product_life_cycle::text) AS product_life_cycle,
            max(pa.style_color_id::text) AS style_color_id,
            max(pa.size_name::text) AS size_name,
            max(pa.season_code::text) AS season_code,
            max(pa.clearance_start_date) AS clearance_start_date,
            max(pa.launch_date) AS launch_date,
            max(pa.collection::text) AS collection,
            max(pa.exit_date::text) AS exit_date,
            max(pa.brand_level::text) AS brand_level
           FROM global.product_attributes_filter pa
          WHERE pa.is_deleted IS FALSE
          GROUP BY pa.article, pa.l0_name, pa.l1_name, pa.l2_name, pa.l3_name, pa.l5_id) grouped_data
WITH DATA;
CREATE UNIQUE INDEX IF NOT EXISTS aggregation_level_filter_unique_idx
        ON global.aggregation_level_filter (
          aggregation_code,
          l1_name,
          l2_name,
          l3_name,
          l4_name
        );