--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co MTP-99891 liquibase:search_fix runOnChange:true stripComments:false splitStatements:false context:MTP-99891_search_fix labels:liquibase_project_start
--comment: search fix in Line Arch SP of  MTP-99891
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.line_plan_choice_launch(jsonb, text);

CREATE OR REPLACE FUNCTION assort_smart.line_plan_choice_launch(input_json jsonb, where_clause text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
declare
    _query_table_filters text := '';
    _query_combine text;
    result json;
begin
    -- Generate table filters using the input JSON
    _query_table_filters := global.form_table_query(input_json);

    -- Construct the dynamic query
    _query_combine := '
        select json_agg(result)
        from (select * from (
            with l as (
                select
                    lpcl.plan_code,
                    lpcl.relevant_size,
                    lpcl.launch,
                    lpcl.hierarchy_code,
                    lpcl.final_level,
                    lpcl.channel,
                    lpcl.sub_channel,
                    lpcl.placeholder_style_id,
                    lpcl.placeholder_choice_id,
                    lpcl.season_code,
                    lpcl.style_tag,
                    lpcl.below_moq_flag,
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
                    lpcl.split_by_delivery,
                    lpcl.flex_subclass_code,
                    lpcl.flex_subclass,
                    lpcl.flex_size_range,
                    array_agg(lpcl.cluster_code) as cluster_code,
                    array_agg(lpcl.cluster_display_name) as cluster_display_name,
                    SUM(cluster_store_count) as cluster_store_count,
                    min(lpcl.image_name_url) as image_name_url,
                    min(lpcl.style_id) as style_id,
                    min(lpcl.color_id) as color_id,
                    min(lpcl.color_name) as color_name,
                    min(style_name) as style_name,
                    min(style_color) as style_color,
                    min(lpcl.launch_start_date) as launch_start_date,
                    min(lpcl.delivery_count) as delivery_count,
                    launch_season,
                    min(lpcl.product_launch_date) as product_launch_date,
                    min(lpcl.product_exit_date) as product_exit_date,
                    (ARRAY_AGG(lpcl."attributes" order by plan_code))[1] as attributes,
                    AVG((lpcl.sales_units->>''season'')::numeric) as sales_units_season,
                    AVG((lpcl.sales_units->>''lifecycle'')::numeric) as sales_units_lifecycle,
                    AVG((lpcl.sales_units->>''season_reco'')::numeric) as sales_units_season_reco,
                    AVG((lpcl.sales_units->>''lifecycle_reco'')::numeric) as sales_units_lifecycle_reco,
                    AVG((lpcl.receipt_units->>''season'')::numeric) as receipt_units_season,
                    AVG((lpcl.receipt_units->>''lifecycle'')::numeric) as receipt_units_lifecycle,
                    AVG((lpcl.receipt_units->>''season_reco'')::numeric) as receipt_units_season_reco,
                    AVG((lpcl.receipt_units->>''lifecycle_reco'')::numeric) as receipt_units_lifecycle_reco,
                    AVG((lpcl.sales->>''season'')::numeric) as sales_season,
                    AVG((lpcl.sales->>''lifecycle'')::numeric) as sales_lifecycle,
                    AVG((lpcl.sales->>''season_reco'')::numeric) as sales_season_reco,
                    AVG((lpcl.sales->>''lifecycle_reco'')::numeric) as sales_lifecycle_reco,
                    AVG((lpcl.gross_margin->>''season'')::numeric) as gross_margin_season,
                    AVG((lpcl.gross_margin->>''lifecycle'')::numeric) as gross_margin_lifecycle,
                    AVG((lpcl.gross_margin->>''season_reco'')::numeric) as gross_margin_season_reco,
                    AVG((lpcl.gross_margin->>''lifecycle_reco'')::numeric) as gross_margin_lifecycle_reco,
                    AVG((lpcl.aps->>''season'')::numeric) as aps_season,
                    AVG((lpcl.aps->>''lifecycle'')::numeric) as aps_lifecycle,
                    AVG((lpcl.aps->>''season_reco'')::numeric) as aps_season_reco,
                    AVG((lpcl.aps->>''lifecycle_reco'')::numeric) as aps_lifecycle_reco,
                    AVG((lpcl.st->>''season'')::numeric) / 100.0 AS st_season,
                    AVG((lpcl.st->>''lifecycle'')::numeric) / 100.0 AS st_lifecycle,
                    AVG((lpcl.st->>''season_reco'')::numeric) / 100.0 AS st_season_reco,
                    AVG((lpcl.st->>''lifecycle_reco'')::numeric) / 100.0 AS st_lifecycle_reco,
                    AVG((lpcl.avg_wk_cnt->>''season'')::numeric) as avg_wk_cnt_season,
                    AVG((lpcl.avg_wk_cnt->>''lifecycle'')::numeric) as avg_wk_cnt_lifecycle,
                    AVG((lpcl.avg_wk_cnt->>''season_reco'')::numeric) as avg_wk_cnt_season_reco,
                    AVG((lpcl.avg_wk_cnt->>''lifecycle_reco'')::numeric) as avg_wk_cnt_lifecycle_reco,
                    AVG((lpcl.aur->>''season'')::numeric) as aur_season,
                    AVG((lpcl.aur->>''lifecycle'')::numeric) as aur_lifecycle,
                    AVG((lpcl.aur->>''season_reco'')::numeric) as aur_season_reco,
                    AVG((lpcl.aur->>''lifecycle_reco'')::numeric) as aur_lifecycle_reco,
                    AVG((lpcl.air->>''season'')::numeric) as air_season,
                    AVG((lpcl.air->>''lifecycle'')::numeric) as air_lifecycle,
                    AVG((lpcl.air->>''season_reco'')::numeric) as air_season_reco,
                    AVG((lpcl.air->>''lifecycle_reco'')::numeric) as air_lifecycle_reco,
                    AVG((lpcl.aic->>''season'')::numeric) as aic_season,
                    AVG((lpcl.aic->>''lifecycle'')::numeric) as aic_lifecycle,
                    AVG((lpcl.aic->>''season_reco'')::numeric) as aic_season_reco,
                    AVG((lpcl.aic->>''lifecycle_reco'')::numeric) as aic_lifecycle_reco,
                    AVG((lpcl.receipts->>''season'')::numeric) as receipts_season,
                    AVG((lpcl.receipts->>''lifecycle'')::numeric) as receipts_lifecycle,
                    AVG((lpcl.receipts->>''season_reco'')::numeric) as receipts_season_reco,
                    AVG((lpcl.receipts->>''lifecycle_reco'')::numeric) as receipts_lifecycle_reco,
                    AVG((lpcl.total_inv_units->>''bop_qty'')::numeric) as total_inv_units_bop_qty,
                    AVG((lpcl.total_inv_units->>''lifecycle'')::numeric) as total_inv_units_lifecycle,
                    sum((lpcl.total_inv_units->>''season'')::numeric) as total_inv_units_season
                from
                    assort_smart.line_plan_choice_launch lpcl
                join assort_smart.channel_details cd
                    on
                        lpcl.channel = cd.channel_id
                ' || where_clause || '
                group by
                    plan_code,
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
                    lpcl.below_moq_flag,
                    lpcl.launch_season,
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
                    lpcl.split_by_delivery,
                    lpcl.flex_subclass_code,
                    lpcl.flex_subclass,
                    lpcl.flex_size_range

            )
select
    l.plan_code,
    l.relevant_size,
    l.launch,
    l.hierarchy_code,
    l.final_level,
    l.channel,
    l.sub_channel,
    l.placeholder_style_id,
    l.placeholder_choice_id,
    l.season_code,
    l.style_tag,
    l.below_moq_flag,
    l.launch_season,
    l.cluster_code,
    l.cluster_display_name,
    l.cluster_store_count,
    l.image_name_url,
    l.style_id,
    l.color_id,
    l.color_name,
    l.style_name,
    l.style_color,
    l.launch_start_date,
    l.delivery_count,
    l.launch_season,
    l.product_launch_date,
    l.product_exit_date,
    l.attributes,
    l.nrf_color_bucket,
	l.carryover_style,
	l.min_per_order,
	l.marketing,
	l.exit_floorset,
	l.sample_request,
	l.vendor_name,
	l.merchant_comments,
	l.planner_comments,
	l.attr_comment_1,
	l.attr_comment_2,
	l.attr_comment_3,
	l.attr_comment_4,
	l.size_range_type,
    l.flex_subclass_code,
    l.flex_subclass,
    l.flex_size_range,
    l.sales_units_season,
	l.total_inv_units_season,
	l.total_inv_units_lifecycle,
    l.split_by_delivery,
	case when l.style_tag = ''New'' then l.sales_units_lifecycle else l.sales_units_season + (ia.sales_units ->> ''lifecycle_reco'')::numeric - (ia.sales_units ->> ''season_reco'')::numeric end as sales_units_lifecycle,
    case when l.style_tag = ''New'' then l.sales_units_season_reco else (ia.sales_units ->> ''season_reco'')::numeric end as sales_units_season_reco,
    case when l.style_tag = ''New'' then l.sales_units_lifecycle_reco else (ia.sales_units ->> ''lifecycle_reco'')::numeric end as sales_units_lifecycle_reco,
    l.receipt_units_season,
	case when l.style_tag = ''New'' then l.receipt_units_lifecycle else l.receipt_units_season + (ia.receipt_units ->> ''lifecycle_reco'')::numeric - (ia.receipt_units ->> ''season_reco'')::numeric end as receipt_units_lifecycle,
    CASE WHEN COALESCE(l.st_season_reco, 0) <> 0
        THEN
            case when l.style_tag = ''New''
                then COALESCE(l.receipt_units_season_reco, 0)
                else COALESCE((ia.sales_units ->> ''season_reco'')::numeric, 0)/l.st_season_reco
            end
        ELSE 0
    end as receipt_units_season_reco,
    CASE WHEN COALESCE(l.st_lifecycle_reco, 0) <> 0
        THEN
            case when l.style_tag = ''New''
                then COALESCE(l.receipt_units_lifecycle_reco, 0)
                else COALESCE((ia.sales_units ->> ''lifecycle_reco'')::numeric, 0)/l.st_lifecycle_reco
            end
        ELSE 0
    end as receipt_units_lifecycle_reco,
    l.sales_season,
	case when l.style_tag = ''New'' then l.sales_lifecycle else l.sales_season + (ia.sales ->> ''lifecycle_reco'')::numeric - (ia.sales ->> ''season_reco'')::numeric end as sales_lifecycle,
    case when l.style_tag = ''New'' then l.sales_season_reco else (ia.sales ->> ''season_reco'')::numeric end as sales_season_reco,
    case when l.style_tag = ''New'' then l.sales_lifecycle_reco else (ia.sales ->> ''lifecycle_reco'')::numeric end as sales_lifecycle_reco,
    l.gross_margin_season,
	case when l.style_tag = ''New'' then l.gross_margin_lifecycle else l.gross_margin_season + (ia.gross_margin ->> ''lifecycle_reco'')::numeric - (ia.gross_margin ->> ''season_reco'')::numeric end as gross_margin_lifecycle,
    case when l.style_tag = ''New'' then l.gross_margin_season_reco else (ia.gross_margin ->> ''season_reco'')::numeric end as gross_margin_season_reco,
    case when l.style_tag = ''New'' then l.gross_margin_lifecycle_reco else (ia.gross_margin ->> ''lifecycle_reco'')::numeric end as gross_margin_lifecycle_reco,
    l.aps_season,
    l.aps_lifecycle,
    case when l.style_tag = ''New'' then l.aps_season_reco else (ia.aps ->> ''season_reco'')::numeric end as aps_season_reco,
    case when l.style_tag = ''New'' then l.aps_lifecycle_reco else (ia.aps ->> ''lifecycle_reco'')::numeric end as aps_lifecycle_reco,
    l.st_season,
    l.st_lifecycle,
    COALESCE(l.st_season_reco, 0) as st_season_reco,
    COALESCE(l.st_lifecycle_reco, 0) as st_lifecycle_reco,
    l.avg_wk_cnt_season,
    l.avg_wk_cnt_lifecycle,
    case when l.style_tag = ''New'' then l.avg_wk_cnt_season_reco else (ia.avg_wk_cnt ->> ''season_reco'')::numeric end as avg_wk_cnt_season_reco,
    case when l.style_tag = ''New'' then l.avg_wk_cnt_lifecycle_reco else (ia.avg_wk_cnt ->> ''lifecycle_reco'')::numeric end as avg_wk_cnt_lifecycle_reco,
    l.aur_season,
    l.aur_lifecycle,
    case when l.style_tag = ''New'' then l.aur_season_reco else (ia.aur ->> ''season_reco'')::numeric end as aur_season_reco,
    case when l.style_tag = ''New'' then l.aur_lifecycle_reco else (ia.aur ->> ''lifecycle_reco'')::numeric end as aur_lifecycle_reco,
    l.air_season,
    l.air_lifecycle,
    case when l.style_tag = ''New'' then l.air_season_reco else (ia.air ->> ''season_reco'')::numeric end as air_season_reco,
    case when l.style_tag = ''New'' then l.air_lifecycle_reco else (ia.air ->> ''lifecycle_reco'')::numeric end as air_lifecycle_reco,
    l.aic_season,
    l.aic_lifecycle,
    case when l.style_tag = ''New'' then l.aic_season_reco else (ia.aic ->> ''season_reco'')::numeric end as aic_season_reco,
    case when l.style_tag = ''New'' then l.aic_lifecycle_reco else (ia.aic ->> ''lifecycle_reco'')::numeric end as aic_lifecycle_reco,
    l.receipts_season,
    case when l.style_tag = ''New'' then l.receipts_lifecycle else l.receipts_season + (ia.receipts ->> ''lifecycle_reco'')::numeric - (ia.receipts ->> ''season_reco'')::numeric end as receipts_lifecycle,
    CASE
        WHEN COALESCE(l.st_season_reco, 0) <> 0
        THEN
        	case when l.style_tag = ''New''
        	then COALESCE(l.receipt_units_season_reco, 0)
        	else COALESCE((ia.sales_units ->> ''season_reco'')::numeric, 0)/l.st_season_reco
        	end
        ELSE 0
    END * (ia.receipts_price_per_unit->>''season_reco'')::numeric as receipt_season_reco,
    CASE
    WHEN COALESCE(l.st_lifecycle_reco, 0) <> 0
    THEN
    	case when l.style_tag = ''New''
    	then COALESCE(l.receipt_units_lifecycle_reco, 0)
    	else COALESCE((ia.sales_units ->> ''lifecycle_reco'')::numeric, 0)/l.st_lifecycle_reco
    	end
    ELSE 0
    END * (ia.receipts_price_per_unit->>''lifecycle_reco'')::numeric as receipt_lifecycle_reco
from l
LEFT JOIN "global".season_master sm
    ON l.season_code = sm.season_code::varchar
LEFT JOIN assort_smart.line_plan_choice_launch_ia ia
    ON l.hierarchy_code = ia.hierarchy_code
    AND l.channel = ia.channel
    AND l.placeholder_choice_id = ia.placeholder_choice_id
    AND sm.name = ia.season_name
    order by case when l.style_tag = ''Carryover'' then 0 else 1 end
    )' || _query_table_filters || '
        ) result
        ';

    -- Debugging statements
    raise notice 'Input JSON: %', input_json;
    raise notice 'Query Table Filters: %', _query_table_filters;
    raise notice 'Query Combine: %', _query_combine;

    -- Execute the dynamic query and store the result
    execute _query_combine
    into result;

    -- Return the result
    return result;
end;
$function$
;
