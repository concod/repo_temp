--liquibase formatted sql
--changeset liquibase:MTP-122871_removing_extra_col runOnChange:true stripComments:false splitStatements:false context:MTP-122871_global_choice_id_added labels:liquibase_project_start
--comment: MTP-122871_global_choice_id_added
--rollback: SELECT 1


DROP FUNCTION  IF EXISTS  assort_smart.line_plan_choice_launch_count(jsonb, text);

CREATE OR REPLACE FUNCTION assort_smart.line_plan_choice_launch_count(input_json jsonb, where_clause text)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
DECLARE
_query_table_filters text := '';
    _query_combine text;
    total_count bigint;
BEGIN

     _query_table_filters := global.form_table_query(input_json);
    _query_combine := '
        SELECT COUNT(*)
        FROM (
            SELECT
                lpcl.global_choice_id, 
                lpcl.plan_code,
                lpcl.color_name,
                lpcl.launch,
                lpcl.attributes,
                lpcl.hierarchy_code,
                lpcl.final_level,
                lpcl.channel,
                lpcl.sub_channel,
                lpcl.placeholder_style_id,
                lpcl.placeholder_choice_id,
                lpcl.target_retail_price,
                lpcl.season_code,
                lpcl.style_tag,
                lpcl.relevant_size,
                lpcl.min_per_order,
                lpcl.target_imu_per,
                lpcl.merchant_comments,
                lpcl.planner_comments,
                lpcl.imu_per,
                lpcl.below_moq_flag,
                min(lpcl.cluster_display_name) as cluster_display_name,
                lpcl.outlet_smu,
                lpcl.launch_season,
                lpcl.flex_size_range,
                lpcl.vendor_name,
                lpcl.min_per_color,
                lpcl.flex_subclass,
                lpcl.flex_subclass_code,
                lpcl.marketing,
                lpcl.sample_request,
                lpcl.size_range_type,
                lpcl.attr_comment_1,
                lpcl.attr_comment_2,
                lpcl.attr_comment_3,
                lpcl.attr_comment_4,
                lpcl.drop_ship,
                lpcl.product_launch_date,
                SUM(cluster_store_count) AS cluster_store_count,
                MIN(lpcl.style_id) AS style_id,
                MIN(style_name) AS style_name,
                MIN(style_color) AS style_color,
                MIN(lpcl.color_id) AS color_id,
                MIN(lpcl.product_exit_date) AS product_exit_date,
                MIN(lpcl.delivery_count) AS delivery_count,
                avg((air->>''season'')::numeric) as air_season,
                MIN(lpcl.launch_start_date) AS launch_start_date
            FROM assort_smart.line_plan_choice_launch lpcl
            JOIN assort_smart.plan_wedge_opt_constraint_wp wp
                USING (hierarchy_code, cluster_code)
            JOIN assort_smart.channel_details cd
                ON lpcl.channel = cd.channel_id
            ' || where_clause || '
            GROUP BY
                lpcl.plan_code,
                wp.plan_code,
                lpcl.outlet_smu,
                lpcl.size_range_type,
                lpcl.flex_size_range,
                lpcl.min_per_color,
                lpcl.marketing,
                lpcl.sample_request,
                lpcl.product_launch_date,
                lpcl.flex_subclass_code,
                lpcl.color_name,
                lpcl.flex_subclass,
                lpcl.target_imu_per,
                lpcl.drop_ship,
                lpcl.imu_per,
                lpcl.relevant_size,
                lpcl.hierarchy_code,
                lpcl.final_level,
                lpcl.channel,
                lpcl.sub_channel,
                lpcl.placeholder_style_id,
                lpcl.placeholder_choice_id,
                lpcl.season_code,
                lpcl.style_tag,
                lpcl.launch,
                lpcl.target_retail_price,
                lpcl.below_moq_flag,
                lpcl.launch_season,
                lpcl.nrf_color_bucket,
                lpcl.carryover_style,
                lpcl.min_per_order,
                lpcl.min_per_color,
                lpcl.marketing,
                lpcl.attributes,
                lpcl.exit_floorset,
                lpcl.sample_request,
                lpcl.vendor_name,
                lpcl.merchant_comments,
                lpcl.planner_comments,
                lpcl.attr_comment_1,
                lpcl.attr_comment_2,
                lpcl.attr_comment_3,
                lpcl.attr_comment_4,
                lpcl.size_range_type,
                lpcl.split_by_delivery,
                lpcl.global_choice_id
        ) grouped_data ' || _query_table_filters || '
    ';

    -- Debug
    RAISE NOTICE 'Count Query: %', _query_combine;

    EXECUTE _query_combine
    INTO total_count;

    RETURN total_count;
END;
$function$
;
