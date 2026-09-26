--liquibase formatted sql
--changeset paras.jain@impactanalytics.co_update_sp liquibase:update_sp_bulk_update_line_plan_choice_launch runOnChange:true stripComments:false splitStatements:false context:MTP-70428 labels:liquibase_project_start
--comment: Updating SP bulk_update_line_plan_choice_launch MTP-70428
--rollback: SELECT 1


DROP FUNCTION IF EXISTS assort_smart.bulk_update_line_plan_choice_launch(jsonb);

CREATE OR REPLACE FUNCTION assort_smart.bulk_update_line_plan_choice_launch(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insert or update records in the assort_smart.line_plan_choice_launch table
    INSERT INTO assort_smart.line_plan_choice_launch (
        plan_code, hierarchy_code, final_level, channel, sub_channel, gender, season_code,
        placeholder_choice_id, placeholder_style_id, image_name_url, style_id, color_id,
        style_name, color_name, style_tag, launch, launch_start_date, split_by_delivery,
        delivery_count, product_launch_date, product_exit_date, launch_season, attributes,
        cluster_code, cluster_display_name, cluster_store_count, total_inv_units, sales_units,
        receipt_units, aps, sales, receipts, st, avg_wk_cnt, gross_margin, aur, air, aic,
        last_season, is_deleted, created_at, updated_at
    )
    SELECT
        (record->>'plan_code')::INT AS plan_code,
        record->>'hierarchy_code' AS hierarchy_code,
        record->>'final_level' AS final_level,
        (record->>'channel')::INT AS channel,
        (record->>'sub_channel')::INT AS sub_channel,
        record->>'gender' AS gender,
        record->>'season_code' AS season_code,
        record->>'placeholder_choice_id' AS placeholder_choice_id,
        record->>'placeholder_style_id' AS placeholder_style_id,
        record->>'image_name_url' AS image_name_url,
        record->>'style_id' AS style_id,
        record->>'color_id' AS color_id,
        record->>'style_name' AS style_name,
        record->>'color_name' AS color_name,
        record->>'style_tag' AS style_tag,
        record->>'launch' AS launch,
        (record->>'launch_start_date')::DATE AS launch_start_date,
        (record->>'split_by_delivery')::BOOLEAN AS split_by_delivery,
        (record->>'delivery_count')::INT AS delivery_count,
        (record->>'product_launch_date')::DATE AS product_launch_date,
        (record->>'product_exit_date')::DATE AS product_exit_date,
        record->>'launch_season' AS launch_season,
        COALESCE(record->'attributes', '{}'::JSONB) AS attributes, -- Safely handle null or invalid JSON
        record->>'cluster_code' AS cluster_code,
        record->>'cluster_display_name' AS cluster_display_name,
        (record->>'cluster_store_count')::INT AS cluster_store_count,
        COALESCE(record->'total_inv_units', '{}'::JSONB) AS total_inv_units,
        COALESCE(record->'sales_units', '{}'::JSONB) AS sales_units,
        COALESCE(record->'receipt_units', '{}'::JSONB) AS receipt_units,
        COALESCE(record->'aps', '{}'::JSONB) AS aps,
        COALESCE(record->'sales', '{}'::JSONB) AS sales,
        COALESCE(record->'receipts', '{}'::JSONB) AS receipts,
        COALESCE(record->'st', '{}'::JSONB) AS st,
        COALESCE(record->'avg_wk_cnt', '{}'::JSONB) AS avg_wk_cnt,
        COALESCE(record->'gross_margin', '{}'::JSONB) AS gross_margin,
        COALESCE(record->'aur', '{}'::JSONB) AS aur,
        COALESCE(record->'air', '{}'::JSONB) AS air,
        COALESCE(record->'aic', '{}'::JSONB) AS aic,
        COALESCE(record->'last_season', '{}'::JSONB) AS last_season,
        (record->>'is_deleted')::BOOLEAN AS is_deleted,
        CURRENT_TIMESTAMP AS created_at,
        CURRENT_TIMESTAMP AS updated_at
    FROM jsonb_array_elements(json_data) AS record
    ON CONFLICT (placeholder_choice_id, placeholder_style_id, plan_code)
    DO UPDATE SET
        plan_code = EXCLUDED.plan_code,
        hierarchy_code = EXCLUDED.hierarchy_code,
        final_level = EXCLUDED.final_level,
        channel = EXCLUDED.channel,
        sub_channel = EXCLUDED.sub_channel,
        gender = EXCLUDED.gender,
        season_code = EXCLUDED.season_code,
        image_name_url = EXCLUDED.image_name_url,
        style_id = EXCLUDED.style_id,
        color_id = EXCLUDED.color_id,
        style_name = EXCLUDED.style_name,
        color_name = EXCLUDED.color_name,
        style_tag = EXCLUDED.style_tag,
        launch = EXCLUDED.launch,
        launch_start_date = EXCLUDED.launch_start_date,
        split_by_delivery = EXCLUDED.split_by_delivery,
        delivery_count = EXCLUDED.delivery_count,
        product_launch_date = EXCLUDED.product_launch_date,
        product_exit_date = EXCLUDED.product_exit_date,
        launch_season = EXCLUDED.launch_season,
        attributes = COALESCE(EXCLUDED.attributes, '{}'::JSONB),
        cluster_code = EXCLUDED.cluster_code,
        cluster_display_name = EXCLUDED.cluster_display_name,
        cluster_store_count = EXCLUDED.cluster_store_count,
        total_inv_units = COALESCE(EXCLUDED.total_inv_units, '{}'::JSONB),
        sales_units = COALESCE(EXCLUDED.sales_units, '{}'::JSONB),
        receipt_units = COALESCE(EXCLUDED.receipt_units, '{}'::JSONB),
        aps = COALESCE(EXCLUDED.aps, '{}'::JSONB),
        sales = COALESCE(EXCLUDED.sales, '{}'::JSONB),
        receipts = COALESCE(EXCLUDED.receipts, '{}'::JSONB),
        st = COALESCE(EXCLUDED.st, '{}'::JSONB),
        avg_wk_cnt = COALESCE(EXCLUDED.avg_wk_cnt, '{}'::JSONB),
        gross_margin = COALESCE(EXCLUDED.gross_margin, '{}'::JSONB),
        aur = COALESCE(EXCLUDED.aur, '{}'::JSONB),
        air = COALESCE(EXCLUDED.air, '{}'::JSONB),
        aic = COALESCE(EXCLUDED.aic, '{}'::JSONB),
        last_season = COALESCE(EXCLUDED.last_season, '{}'::JSONB),
        is_deleted = EXCLUDED.is_deleted,
        updated_at = EXCLUDED.updated_at;

    -- Optional: Print a notice indicating the function completion
    RAISE NOTICE 'Bulk update operation completed.';
END;
$function$
;