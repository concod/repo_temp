--liquibase formatted sql
--changeset liquibase:update_store_count runOnChange:true stripComments:false splitStatements:false context:update_store_count labels:liquibase_project_start
--comment: Replace '0' with empty string for NULL relevant_size values
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.line_plan_choice_launch(jsonb, text);

CREATE OR REPLACE FUNCTION assort_smart.line_plan_choice_launch(input_json jsonb, where_clause text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
declare
    _query_table_filters text := '';
    _query_combine text;
    _channel_filter text := '';
    _season_filter text := '';
    _channel_match text[];
    _season_match text[];
    result json;
begin
    _query_table_filters := global.form_table_query(input_json);

    _channel_match := regexp_match(where_clause, 'lpcl\.channel\s+in\s*\(([^)]+)\)', 'i');
    IF _channel_match IS NOT NULL THEN
        _channel_filter := 'AND ia.channel IN (' || _channel_match[1] || ')';
    ELSE
        _channel_match := regexp_match(where_clause, 'lpcl\.channel\s*=\s*(\d+)', 'i');
        IF _channel_match IS NOT NULL THEN
            _channel_filter := 'AND ia.channel = ' || _channel_match[1];
        END IF;
    END IF;

    _season_match := regexp_match(where_clause, 'lpcl\.season_code\s+in\s*\(([^)]+)\)', 'i');
    IF _season_match IS NOT NULL THEN
        _season_filter := 'AND ia.season_name IN (SELECT name FROM "global".season_master WHERE season_code::text IN (' || _season_match[1] || '))';
    ELSE
        _season_match := regexp_match(where_clause, 'lpcl\.season_code\s*=\s*''([^'']+)''', 'i');
        IF _season_match IS NOT NULL THEN
            _season_filter := 'AND ia.season_name IN (SELECT name FROM "global".season_master WHERE season_code::text = ''' || _season_match[1] || ''')';
        END IF;
    END IF;

    _query_combine := '
        select json_agg(result)
        from (select * from (
            with l as (
                select
                    lpcl.plan_code,
                    COALESCE(lpcl.relevant_size, '''') as relevant_size,
                    lpcl.launch,
                    lpcl.placeholder_style,
                    lpcl.placeholder_color,
                    lpcl.hierarchy_code,
                    lpcl.final_level,
                    lpcl.channel,
                    lpcl.sub_channel,
                    lpcl.placeholder_style_id,
                    lpcl.placeholder_choice_id,
                    lpcl.placeholder_choice_id_order,
                    lpcl.season_code,
                    lpcl.style_tag,
                    lpcl.below_moq_flag,
                    lpcl.exit_floorset,
                    lpcl.split_by_delivery,
                    lpcl.merchant_comments,
                    lpcl.planner_comments,
                    ARRAY_AGG(lpcl.cluster_code) FILTER (WHERE lpcl.flow_cluster_perc > 0 AND lpcl.cluster_code IS NOT NULL AND lpcl.cluster_display_name IS NOT NULL) as cluster_code,
                    ARRAY_AGG(lpcl.cluster_display_name) FILTER (WHERE lpcl.flow_cluster_perc > 0 AND lpcl.cluster_code IS NOT NULL AND lpcl.cluster_display_name IS NOT NULL) as cluster_display_name,
                    SUM(
                    CASE
                        WHEN (lpcl.total_inv_units_bop_qty > 0 OR lpcl.flow_cluster_perc > 0)
                        THEN lpcl.cluster_store_count
                        ELSE 0
                    END
                    ) AS cluster_store_count,
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
                    COALESCE(min(wp.min_value), 0) as min_value,
                    COALESCE(max(wp.max_value), 0) as max_value,
                    (ARRAY_AGG(lpcl."attributes" order by lpcl.plan_code))[1] as attributes,
                    AVG(lpcl.sales_units_season) as sales_units_season,
                    AVG(lpcl.sales_units_lifecycle) as sales_units_lifecycle,
                    AVG(lpcl.sales_units_season_reco) as sales_units_season_reco,
                    AVG(lpcl.sales_units_lifecycle_reco) as sales_units_lifecycle_reco,
                    AVG(lpcl.receipt_units_season) as receipt_units_season,
                    AVG(lpcl.receipt_units_lifecycle) as receipt_units_lifecycle,
                    AVG(lpcl.receipt_units_season_reco) as receipt_units_season_reco,
                    AVG(lpcl.receipt_units_lifecycle_reco) as receipt_units_lifecycle_reco,
                    AVG(lpcl.sales_season) as sales_season,
                    AVG(lpcl.sales_lifecycle) as sales_lifecycle,
                    AVG(lpcl.sales_season_reco) as sales_season_reco,
                    AVG(lpcl.sales_lifecycle_reco) as sales_lifecycle_reco,
                    AVG(lpcl.gross_margin_season) as gross_margin_season,
                    AVG(lpcl.gross_margin_lifecycle) as gross_margin_lifecycle,
                    AVG(lpcl.gross_margin_season_reco) as gross_margin_season_reco,
                    AVG(lpcl.gross_margin_lifecycle_reco) as gross_margin_lifecycle_reco,
                    AVG(lpcl.aps_season) as aps_season,
                    AVG(lpcl.aps_lifecycle) as aps_lifecycle,
                    AVG(lpcl.aps_season_reco) as aps_season_reco,
                    AVG(lpcl.aps_lifecycle_reco) as aps_lifecycle_reco,
                    AVG(lpcl.st_season) as st_season,
                    AVG(lpcl.st_lifecycle) as st_lifecycle,
                    AVG(lpcl.st_season_reco) as st_season_reco,
                    AVG(lpcl.st_lifecycle_reco) as st_lifecycle_reco,
                    AVG(lpcl.avg_wk_cnt_season) as avg_wk_cnt_season,
                    AVG(lpcl.avg_wk_cnt_lifecycle) as avg_wk_cnt_lifecycle,
                    AVG(lpcl.avg_wk_cnt_season_reco) as avg_wk_cnt_season_reco,
                    AVG(lpcl.avg_wk_cnt_lifecycle_reco) as avg_wk_cnt_lifecycle_reco,
                    AVG(lpcl.aur_season) as aur_season,
                    AVG(lpcl.aur_lifecycle) as aur_lifecycle,
                    AVG(lpcl.aur_season_reco) as aur_season_reco,
                    AVG(lpcl.aur_lifecycle_reco) as aur_lifecycle_reco,
                    AVG(lpcl.air_season) as air_season,
                    AVG(lpcl.air_lifecycle) as air_lifecycle,
                    AVG(lpcl.air_season_reco) as air_season_reco,
                    AVG(lpcl.air_lifecycle_reco) as air_lifecycle_reco,
                    AVG(lpcl.aic_season) as aic_season,
                    AVG(lpcl.aic_lifecycle) as aic_lifecycle,
                    AVG(lpcl.aic_season_reco) as aic_season_reco,
                    AVG(lpcl.aic_lifecycle_reco) as aic_lifecycle_reco,
                    AVG(lpcl.receipts_season) as receipts_season,
                    AVG(lpcl.receipts_lifecycle) as receipts_lifecycle,
                    AVG(lpcl.receipts_season_reco) as receipts_season_reco,
                    AVG(lpcl.receipts_lifecycle_reco) as receipts_lifecycle_reco,
                    AVG(lpcl.total_inv_units_bop_qty) as total_inv_units_bop_qty,
                    AVG(lpcl.total_inv_units_lifecycle) as total_inv_units_lifecycle,
                    AVG(lpcl.total_inv_units_season) as total_inv_units_season,
                    vendor_product_id,
                    product_description,
                    range,
                    color_family,
                    country_of_origin,
                    value_stream,
                    season,
                    season_year,
                    price_architecture,
                    sustainability,
                    commitment_type,
                    choice_status,
                    material,
                    pattern,
                    fit,
                    width,
                    license,
                    down_ratio,
                    thread_count
                from
                    assort_smart.line_plan_choice_launch lpcl
                join assort_smart.channel_details cd
                    on lpcl.channel = cd.channel_id
                left join assort_smart.plan_wedge_opt_constraint_wp wp
                    using (hierarchy_code,cluster_code)
                ' || where_clause || '
                group by
                    lpcl.plan_code,
                    wp.plan_code,
                    lpcl.relevant_size,
                    lpcl.hierarchy_code,
                    lpcl.final_level,
                    lpcl.channel,
                    lpcl.sub_channel,
                    lpcl.placeholder_style,
                    lpcl.placeholder_color,
                    lpcl.placeholder_style_id,
                    lpcl.placeholder_choice_id,
                    lpcl.placeholder_choice_id_order,
                    lpcl.season_code,
                    lpcl.style_tag,
                    lpcl.launch,
                    lpcl.below_moq_flag,
                    lpcl.launch_season,
                    lpcl.exit_floorset,
                    lpcl.split_by_delivery,
                    lpcl.merchant_comments,
                    lpcl.planner_comments,
                    lpcl.vendor_product_id,
                    lpcl.product_description,
                    lpcl.range,
                    lpcl.color_family,
                    lpcl.country_of_origin,
                    lpcl.value_stream,
                    lpcl.season,
                    lpcl.season_year,
                    lpcl.price_architecture,
                    lpcl.sustainability,
                    lpcl.commitment_type,
                    lpcl.choice_status,
                    lpcl.material,
                    lpcl.pattern,
                    lpcl.fit,
                    lpcl.width,
                    lpcl.license,
                    lpcl.down_ratio,
                    lpcl.thread_count
            ),
            ia_pre AS (
                SELECT ia.hierarchy_code, ia.channel, ia.placeholder_choice_id, ia.season_name,
                    ia.sales_units, ia.sales, ia.gross_margin, ia.aps, ia.avg_wk_cnt,
                    ia.aur, ia.air, ia.aic, ia.receipts_price_per_unit
                FROM assort_smart.line_plan_choice_launch_ia ia
                WHERE EXISTS (
                    SELECT 1 FROM l
                    WHERE l.hierarchy_code = ia.hierarchy_code
                      AND l.channel = ia.channel
                      AND l.placeholder_choice_id = ia.placeholder_choice_id
                )
                  ' || _channel_filter || ' ' || _season_filter || '
            )
select
    l.plan_code,
    l.relevant_size,
    l.launch,
    l.hierarchy_code,
    l.final_level,
    l.channel,
    l.sub_channel,
    l.placeholder_style,
    l.placeholder_color,
    l.placeholder_style_id,
    l.placeholder_choice_id,
    l.placeholder_choice_id_order,
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
    l.exit_floorset,
    l.sales_units_season,
    l.receipt_units_season + l.total_inv_units_bop_qty as total_inv_units_season,
    l.total_inv_units_lifecycle AS total_inv_units_lifecycle,
    l.split_by_delivery,
    l.merchant_comments,
    l.planner_comments,
    l.total_inv_units_bop_qty,
    l.min_value,
    l.max_value,
    l.receipt_units_season - l.sales_units_season as season_eop,
    l.sales_units_lifecycle AS sales_units_lifecycle,
    case when l.style_tag = ''New'' then COALESCE(l.sales_units_season_reco, 0) else COALESCE((ia.sales_units ->> ''season_reco'')::numeric, 0) end as sales_units_season_reco,
    case when l.style_tag = ''New'' then COALESCE(l.sales_units_lifecycle_reco, 0) else COALESCE((ia.sales_units ->> ''lifecycle_reco'')::numeric, 0) end as sales_units_lifecycle_reco,
    COALESCE(l.receipt_units_season, 0) as receipt_units_season,
    l.receipt_units_lifecycle AS receipt_units_lifecycle,
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
    COALESCE(l.sales_season, 0) as sales_season,
    l.sales_lifecycle AS sales_lifecycle,
    case when l.style_tag = ''New'' then COALESCE(l.sales_season_reco, 0) else COALESCE((ia.sales ->> ''season_reco'')::numeric, 0) end as sales_season_reco,
    case when l.style_tag = ''New'' then COALESCE(l.sales_lifecycle_reco, 0) else COALESCE((ia.sales ->> ''lifecycle_reco'')::numeric, 0) end as sales_lifecycle_reco,
    COALESCE(l.gross_margin_season, 0) as gross_margin_season,
    l.gross_margin_lifecycle AS gross_margin_lifecycle,
    case when l.style_tag = ''New'' then COALESCE(l.gross_margin_season_reco, 0) else COALESCE((ia.gross_margin ->> ''season_reco'')::numeric, 0) end as gross_margin_season_reco,
    case when l.style_tag = ''New'' then COALESCE(l.gross_margin_lifecycle_reco, 0) else COALESCE((ia.gross_margin ->> ''lifecycle_reco'')::numeric, 0) end as gross_margin_lifecycle_reco,
    COALESCE(l.aps_season, 0) as aps_season,
    COALESCE(l.aps_lifecycle, 0) as aps_lifecycle,
    case when l.style_tag = ''New'' then COALESCE(l.aps_season_reco, 0) else COALESCE((ia.aps ->> ''season_reco'')::numeric, 0) end as aps_season_reco,
    case when l.style_tag = ''New'' then COALESCE(l.aps_lifecycle_reco, 0) else COALESCE((ia.aps ->> ''lifecycle_reco'')::numeric, 0) end as aps_lifecycle_reco,
    COALESCE(l.st_season, 0) as st_season,
    COALESCE(l.st_lifecycle, 0) as st_lifecycle,
    COALESCE(l.st_season_reco, 0) as st_season_reco,
    COALESCE(l.st_lifecycle_reco, 0) as st_lifecycle_reco,
    COALESCE(l.avg_wk_cnt_season, 0) as avg_wk_cnt_season,
    COALESCE(l.avg_wk_cnt_lifecycle, 0) as avg_wk_cnt_lifecycle,
    case when l.style_tag = ''New'' then COALESCE(l.avg_wk_cnt_season_reco, 0) else COALESCE((ia.avg_wk_cnt ->> ''season_reco'')::numeric, 0) end as avg_wk_cnt_season_reco,
    case when l.style_tag = ''New'' then COALESCE(l.avg_wk_cnt_lifecycle_reco, 0) else COALESCE((ia.avg_wk_cnt ->> ''lifecycle_reco'')::numeric, 0) end as avg_wk_cnt_lifecycle_reco,
    COALESCE(l.aur_season, 0) as aur_season,
    COALESCE(l.aur_lifecycle, 0) as aur_lifecycle,
    case when l.style_tag = ''New'' then COALESCE(l.aur_season_reco, 0) else COALESCE((ia.aur ->> ''season_reco'')::numeric, 0) end as aur_season_reco,
    case when l.style_tag = ''New'' then COALESCE(l.aur_lifecycle_reco, 0) else COALESCE((ia.aur ->> ''lifecycle_reco'')::numeric, 0) end as aur_lifecycle_reco,
    COALESCE(l.air_season, 0) as air_season,
    COALESCE(l.air_lifecycle, 0) as air_lifecycle,
    case when l.style_tag = ''New'' then COALESCE(l.air_season_reco, 0) else COALESCE((ia.air ->> ''season_reco'')::numeric, 0) end as air_season_reco,
    case when l.style_tag = ''New'' then COALESCE(l.air_lifecycle_reco, 0) else COALESCE((ia.air ->> ''lifecycle_reco'')::numeric, 0) end as air_lifecycle_reco,
    COALESCE(l.aic_season, 0) as aic_season,
    COALESCE(l.aic_lifecycle, 0) as aic_lifecycle,
    case when l.style_tag = ''New'' then COALESCE(l.aic_season_reco, 0) else COALESCE((ia.aic ->> ''season_reco'')::numeric, 0) end as aic_season_reco,
    case when l.style_tag = ''New'' then COALESCE(l.aic_lifecycle_reco, 0) else COALESCE((ia.aic ->> ''lifecycle_reco'')::numeric, 0) end as aic_lifecycle_reco,
    COALESCE(l.receipts_season, 0) as receipts_season,
    l.receipts_lifecycle AS receipts_lifecycle,
    CASE WHEN COALESCE(l.st_season_reco, 0) <> 0
        THEN
            case when l.style_tag = ''New''
            then COALESCE(l.receipt_units_season_reco, 0)
            else COALESCE((ia.sales_units ->> ''season_reco'')::numeric, 0)/l.st_season_reco
            end
        ELSE 0
    END * (ia.receipts_price_per_unit->>''season_reco'')::numeric as receipts_season_reco,
    CASE WHEN COALESCE(l.st_lifecycle_reco, 0) <> 0
    THEN
        case when l.style_tag = ''New''
        then COALESCE(l.receipt_units_lifecycle_reco, 0)
        else COALESCE((ia.sales_units ->> ''lifecycle_reco'')::numeric, 0)/l.st_lifecycle_reco
        end
    ELSE 0
    END * (ia.receipts_price_per_unit->>''lifecycle_reco'')::numeric as receipt_lifecycle_reco,
    l.vendor_product_id,
    l.product_description,
    l.range,
    l.color_family,
    l.country_of_origin,
    l.value_stream,
    l.season,
    l.season_year,
    l.price_architecture,
    l.sustainability,
    l.commitment_type,
    l.choice_status,
    l.material,
    l.pattern,
    l.fit,
    l.width,
    l.license,
    l.down_ratio,
    l.thread_count,
    CASE WHEN COALESCE(l.air_season, 0) <> 0 THEN (COALESCE(l.air_season, 0) - COALESCE(l.aur_season, 0)) / COALESCE(l.air_season, 0) ELSE 0 END as discount
from l
LEFT JOIN "global".season_master sm ON l.season_code = sm.season_code::varchar
LEFT JOIN ia_pre ia
    ON l.hierarchy_code = ia.hierarchy_code
    AND l.channel = ia.channel
    AND l.placeholder_choice_id = ia.placeholder_choice_id
    AND sm.name = ia.season_name
order by case when l.style_tag = ''Carryover'' then 0 else 1 end, l.placeholder_choice_id
)as semi_result ' || _query_table_filters || ') result';

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'FINAL QUERY:' ;
    RAISE NOTICE '%', _query_combine;
    RAISE NOTICE '=================================================';

    execute _query_combine into result;
    return result;
end;
$function$
;
