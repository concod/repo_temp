--liquibase formatted sql
--changeset shreyansh.jain:ph_master_update_product_codes stripComments:false runOnChange:true splitStatements:false context:MTP labels:New_Approach_of_MV
--comment: ph_master_update_product_codes

-- inventory_smart.ph_master source

drop materialized view if exists inventory_smart.ph_master cascade;

CREATE MATERIALIZED VIEW inventory_smart.ph_master
TABLESPACE pg_default
AS
WITH filtered_product_data AS (
    SELECT
        paf.product_code,
        paf.article,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.l6_name,
        paf.l7_name,
        paf.l8_name,
        paf.color_code,
        paf.original_price,
        paf.active,
        paf.product_description,
        ast.article_status_tag,
        ast.new_size,
        ast.channel,
        ast."order",
        paf.product_name,
        paf.product_line,
        paf.product_bucket_code,
        paf.color_description,
        paf.color_family,
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
        paf.rcl_hash
    FROM global.product_attributes_filter paf
    JOIN inventory_smart.article_status_tag ast
      ON paf.product_code::text = ast.product_code::text
    WHERE paf.active = true
      AND (ast.article_status_tag::text <> ALL (ARRAY['Old'::varchar::text, ''::varchar::text]))
      AND ast.new_size IS NOT NULL
),
filtered_hierarchies AS (
    SELECT
        phf.hierarchy_code AS ph_code,
        phf.path ->> 'l0_name'::text AS l0_name,
        phf.path ->> 'l1_name'::text AS l1_name,
        phf.path ->> 'l2_name'::text AS l2_name,
        phf.path ->> 'l3_name'::text AS l3_name,
        phf.path ->> 'l4_name'::text AS l4_name,
        phf.path ->> 'l5_name'::text AS l5_name,
        phf.path ->> 'article'::text  AS article
    FROM global.product_hierarchies_filter phf
    WHERE phf.level = (
        SELECT pgsm.hierarchy_level
        FROM global.product_generic_schema_mapping pgsm
        WHERE pgsm.generic_column_name::text = 'article'::text
    )
      AND phf.active = true
),
-- keep as-is if you still want to restrict to the "top" articles; otherwise you can remove this CTE + join entirely
corrected_intro_dates AS (
    SELECT article
    FROM (
        SELECT
            article,
            cnt,
            ROW_NUMBER() OVER (PARTITION BY article ORDER BY cnt DESC) AS row_num
        FROM (
            SELECT
                fpd.article,
                COUNT(*) AS cnt
            FROM filtered_product_data fpd
            GROUP BY fpd.article
        ) t
    ) ranked
    WHERE row_num = 1
),
product_hierarchy_joined AS (
    SELECT
        fpd.*,
        ph.ph_code
    FROM filtered_product_data fpd
    JOIN filtered_hierarchies ph
      ON fpd.l0_name::text = ph.l0_name
     AND COALESCE(fpd.l1_name, '-'::varchar)::text = ph.l1_name
     AND COALESCE(fpd.l2_name, '-'::varchar)::text = ph.l2_name
     AND COALESCE(fpd.l3_name, '-'::varchar)::text = ph.l3_name
     AND COALESCE(fpd.l4_name, '-'::varchar)::text = ph.l4_name
     AND COALESCE(fpd.l5_name, '-'::varchar)::text = ph.l5_name
     AND fpd.article::text = ph.article
),
flattened_data AS (
    SELECT
        phj.*,
        rp.value AS replacement_code,
        rf.value AS reference_code
    FROM product_hierarchy_joined phj
    LEFT JOIN LATERAL unnest(COALESCE(phj.replacement_product_codes, ARRAY[]::text[])) AS rp(value) ON TRUE
    LEFT JOIN LATERAL unnest(COALESCE(phj.reference_product_codes, ARRAY[]::text[])) AS rf(value) ON TRUE
),
final_result AS (
    SELECT
        phj.article,

        -- pick one representative value per article (stable choice: MAX/MIN)
        MAX(phj.l0_name) AS l0_name,
        MAX(phj.l1_name) AS l1_name,
        MAX(phj.l2_name) AS l2_name,
        MAX(phj.l3_name) AS l3_name,
        MAX(phj.l4_name) AS l4_name,
        MAX(phj.l5_name) AS l5_name,
        MAX(phj.l6_name) AS l6_name,
        MAX(phj.l7_name) AS l7_name,
        MAX(phj.l8_name) AS l8_name,

        MAX(phj.color_code) AS color_code,
        MAX(phj.original_price) AS original_price,
        BOOL_OR(phj.active) AS active,
        MAX(phj.ph_code) AS ph_code,
        MAX(phj.article_status_tag) AS article_status_tag,
        MAX(phj.channel) AS channel,

        (array_remove(array_agg(DISTINCT phj.product_description), NULL::text))[1] AS product_description,

        array_agg(DISTINCT jsonb_build_object(
            'size', phj.new_size,
            'product_code', phj.product_code,
            'new_size', phj.new_size,
            'order', phj."order"
        )) AS product_code_size_map,

        array_agg(DISTINCT phj.new_size) AS sizes,

        -- ✅ THIS is your requirement: multiple product codes in one row
        array_agg(DISTINCT phj.product_code) AS product_codes,

        (array_remove(array_agg(DISTINCT phj.product_name), NULL))[1] AS product_name,
        (array_remove(array_agg(DISTINCT phj.product_line), NULL))[1] AS product_line,
        (array_remove(array_agg(DISTINCT phj.article_status_tag), NULL))[1] AS article_status,
        (array_remove(array_agg(DISTINCT phj.product_bucket_code), NULL))[1] AS product_bucket_code,
        (array_remove(array_agg(DISTINCT phj.color_description), NULL))[1] AS color_description,
        (array_remove(array_agg(DISTINCT phj.color_family), NULL))[1] AS color_family,
        (array_remove(array_agg(DISTINCT phj.launch_date), NULL))[1] AS launch_date,
        (array_remove(array_agg(DISTINCT phj.season_code), NULL))[1] AS season_code,
        (array_remove(array_agg(DISTINCT phj.silhouette), NULL))[1] AS silhouette,
        (array_remove(array_agg(DISTINCT phj.planning_product_grouping), NULL))[1] AS planning_product_grouping,
        (array_remove(array_agg(DISTINCT phj.gender), NULL))[1] AS gender,
        (array_remove(array_agg(DISTINCT phj.flex_status), NULL))[1] AS flex_status,
        (array_remove(array_agg(DISTINCT phj.global_merch_team), NULL))[1] AS global_merch_team,
        (array_remove(array_agg(DISTINCT phj.fit_classification), NULL))[1] AS fit_classification,
        (array_remove(array_agg(DISTINCT phj.design_line), NULL))[1] AS design_line,
        (array_remove(array_agg(DISTINCT phj.designed_for_activity), NULL))[1] AS designed_for_activity,
        (array_remove(array_agg(DISTINCT phj.size_scale), NULL))[1] AS size_scale,
        (array_remove(array_agg(DISTINCT phj.product_development_pod), NULL))[1] AS product_development_pod,
        (array_remove(array_agg(DISTINCT phj.product_size_definition), NULL))[1] AS product_size_definition,
        (array_remove(array_agg(DISTINCT phj.global_line_segment_style_category), NULL))[1] AS global_line_segment_style_category,
        (array_remove(array_agg(DISTINCT phj.created_at), NULL))[1] AS created_at,
        (array_remove(array_agg(DISTINCT phj.updated_at), NULL))[1] AS updated_at,
        (array_remove(array_agg(DISTINCT phj.created_by), NULL))[1] AS created_by,
        (array_remove(array_agg(DISTINCT phj.updated_by), NULL))[1] AS updated_by,
        (array_remove(array_agg(DISTINCT phj.is_deleted), NULL))[1] AS is_deleted,
        (array_remove(array_agg(DISTINCT phj.cost), NULL))[1] AS cost,
        (array_remove(array_agg(DISTINCT phj.price), NULL))[1] AS price,
        (array_remove(array_agg(DISTINCT phj.receipt_date), NULL))[1] AS receipt_date,
        (array_remove(array_agg(DISTINCT phj.clearance), NULL))[1] AS clearance,

        array_agg(DISTINCT phj.replacement_code) AS replacement_product_codes,
        array_agg(DISTINCT phj.reference_code)   AS reference_product_codes,

        (array_remove(array_agg(DISTINCT phj.article_original), NULL))[1] AS article_original,
        (array_remove(array_agg(DISTINCT phj.product_code_original), NULL))[1] AS product_code_original
    FROM flattened_data phj
    JOIN corrected_intro_dates cid
      ON phj.article::text = cid.article::text
    GROUP BY
        phj.article
)
SELECT
    l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name,
    color_code, original_price, active, article, ph_code,
    article_status_tag,
    product_description,
    product_code_size_map, sizes, product_codes,
    null as product_code,
    channel,
    product_name,
    product_line,
    article_status,
    color_description,
    color_family,
    launch_date,
    season_code,
    silhouette,
    planning_product_grouping,
    gender,
    flex_status,
    global_merch_team,
    fit_classification,
    design_line,
    designed_for_activity,
    size_scale,
    product_development_pod,
    product_size_definition,
    global_line_segment_style_category,
    created_at,
    updated_at,
    created_by,
    updated_by,
    is_deleted,
    cost,
    replacement_product_codes,
    price,
    receipt_date,
    clearance,
    reference_product_codes,
    article_original,
    product_code_original
FROM final_result
WITH DATA;

-- Indexes unchanged
CREATE INDEX ph_master_article_idx  ON inventory_smart.ph_master USING btree (article);
CREATE INDEX ph_master_channel_idx  ON inventory_smart.ph_master USING btree (channel);
CREATE INDEX ph_master_l0_name_idx  ON inventory_smart.ph_master USING btree (l0_name);
CREATE INDEX ph_master_ph_code_idx  ON inventory_smart.ph_master USING btree (ph_code);
CREATE UNIQUE INDEX ph_master_ph_code_unidx ON inventory_smart.ph_master USING btree (ph_code, channel);