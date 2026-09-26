--liquibase formatted sql
--changeset liquibase:MTP-124941_removing_unwanted_columns_name runOnChange:true stripComments:false splitStatements:false context:MTP-122871_creating_count_sp labels:liquibase_project_start
--comment: 124941_removing_unwanted_columns_name
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
                lpcl.plan_code,
                lpcl.season,
                lpcl.sustainability,
                lpcl.commitment_type,
                lpcl.vendor_product_id,
                lpcl.color_name,
                lpcl.choice_status,
                lpcl.launch,
                lpcl.value_stream,
                lpcl.color_family,
                lpcl.hierarchy_code,
                lpcl.final_level,
                lpcl.channel,
                lpcl.sub_channel,
                lpcl.attributes,
                lpcl.placeholder_style_id,
                lpcl.placeholder_choice_id,
                lpcl.season_code,
                lpcl.style_tag,
                lpcl.below_moq_flag,
                lpcl.price_architecture,
                lpcl.relevant_size,
                min(lpcl.cluster_display_name) as cluster_display_name,
                lpcl.launch_season,
                lpcl.material,
                lpcl.pattern,
                lpcl.fit,
		        lpcl.width,
		        lpcl.range,
		        lpcl.license,
		        lpcl.down_ratio,
		        lpcl.country_of_origin,
		         lpcl.vendor_name,
                lpcl.merchant_comments,
                lpcl.planner_comments,
                lpcl.attr_comment_1,
                lpcl.attr_comment_2,
                lpcl.attr_comment_3,
                lpcl.attr_comment_4,
                lpcl.size_range_type,
                SUM(cluster_store_count) AS cluster_store_count,
                MIN(lpcl.style_id) AS style_id,
                MIN(style_name) AS style_name,
                MIN(style_color) AS style_color,
                MIN(lpcl.color_id) AS color_id,
                MIN(lpcl.product_exit_date) AS product_exit_date,
                MIN(lpcl.delivery_count) AS delivery_count,
                MIN(lpcl.launch_start_date) AS launch_start_date
            FROM assort_smart.line_plan_choice_launch lpcl
            JOIN assort_smart.plan_wedge_opt_constraint_wp wp
                USING (hierarchy_code, cluster_code)
            JOIN assort_smart.channel_details cd
                ON lpcl.channel = cd.channel_id
            ' || where_clause || '
            GROUP BY
            lpcl.vendor_product_id,
            lpcl.sustainability,
            lpcl.choice_status,
            lpcl.color_family,
            lpcl.value_stream,
            lpcl.price_architecture,
            lpcl.season,
                lpcl.plan_code,
                wp.plan_code,
                lpcl.commitment_type,
                lpcl.color_name,
                lpcl.relevant_size,
                lpcl.attributes,
                lpcl.hierarchy_code,
                lpcl.final_level,
                lpcl.channel,
                lpcl.sub_channel,
                lpcl.placeholder_style_id,
                lpcl.placeholder_choice_id,
                lpcl.season_code,
                lpcl.style_tag,
                lpcl.launch,
                lpcl.below_moq_flag,
                lpcl.relevant_size,
                lpcl.launch_season,
                lpcl.material,
                lpcl.pattern,
                lpcl.fit,
		        lpcl.width,
		        lpcl.range,
		        lpcl.license,
		        lpcl.down_ratio,
		        lpcl.country_of_origin,
                lpcl.nrf_color_bucket,
                lpcl.carryover_style,
                lpcl.min_per_order,
                lpcl.marketing,
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
                lpcl.split_by_delivery
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
