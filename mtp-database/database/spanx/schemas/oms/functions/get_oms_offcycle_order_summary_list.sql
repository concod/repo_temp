--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_oms_offcycle_order_summary_list_spanx_v10 runOnChange:true stripComments:false splitStatements:false context:MTP-99268 labels:style_order_summary_vs_test_update_24-3
--comment: complete rewrite with new query structure, enhanced filtering logic for size/article directly on oor table, and improved timeline aggregation
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_offcycle_order_summary_list(refcursor, jsonb, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_offcycle_order_summary_list(input refcursor, product_filter jsonb, store_filter jsonb, meta jsonb, styles text, months text, fiscal_weeks text, draft_id text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sql TEXT := '';
    v_product_filter_sql text := '';
    v_pa_query text := '';
    v_sa_query text := '';
    v_pa_join text := '';
    v_limit_cls text := '';
    v_sort_cls text := '';
    v_search_cls text := '';
    limit_json jsonb := '{}';
    search_json jsonb := '{}';
    sort_json jsonb := '{}';
    v_start_date date := NULL;
    v_end_date date := NULL;
    v_start_week int4 := NULL;
    v_end_week int4 := NULL;
    v_key TEXT;
    v_values jsonb;
    default_sort text := ' ORDER BY order_generation_date ASC';
BEGIN
    -- Generate filters similar to get_oms_offcycle_order_detailed_dc_summary
    -- Note: 'size' and 'article' are direct columns in oms_cof_orders_recommended, not in product_attributes_filter

    IF product_filter IS NOT NULL AND jsonb_typeof(product_filter) = 'object' THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(product_filter)
        LOOP
            DECLARE val_list text[];
            BEGIN
                SELECT array_agg(val)
                INTO val_list
                FROM jsonb_array_elements_text(v_values->0->'values') AS t(val);

                IF val_list IS NULL OR array_length(val_list, 1) = 0 THEN
                    CONTINUE;
                END IF;

                -- Handle 'size' and 'article' filters directly on oor table, not through product_attributes_filter
                IF v_key IN ('size', 'article') THEN
                    v_sa_query := v_sa_query ||
                        format(' AND oor.%I IN (%s)',
                               v_key,
                               (SELECT string_agg(quote_literal(v), ',') FROM unnest(val_list) v)
                        );
                ELSE
                    -- Other product attributes filtered through product_attributes_filter
                    v_pa_query := v_pa_query ||
                        format(' AND paf.%I IN (%s)',
                               v_key,
                               (SELECT string_agg(quote_literal(v), ',') FROM unnest(val_list) v)
                        );
                END IF;
            END;
        END LOOP;
    END IF;

    IF store_filter IS NOT NULL AND jsonb_typeof(store_filter) = 'object' THEN
        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(store_filter)
        LOOP
            DECLARE val_list text[];
            BEGIN
                SELECT array_agg(val)
                INTO val_list
                FROM jsonb_array_elements_text(v_values->0->'values') AS t(val);

                IF val_list IS NULL OR array_length(val_list, 1) = 0 THEN
                    CONTINUE;
                END IF;

                v_sa_query := v_sa_query ||
                    format(' AND oor.%I IN (%s)',
                           v_key,
                           (SELECT string_agg(quote_literal(v), ',') FROM unnest(val_list) v)
                    );
            END;
        END LOOP;
    END IF;

    -- Parse fiscal_weeks parameter if provided (format: "start_week-end_week" or similar)
    -- For now, we'll rely on the receipt_fiscal_year_week in the filters
    -- You can extend this logic based on your fiscal_weeks parameter format

    -- Extract limit, sort, and search from meta
    search_json := meta;

    IF meta <> '{}' AND meta -> 'limit' IS NOT NULL THEN
        limit_json := meta -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
    END IF;

    IF meta <> '{}' AND meta -> 'sort' IS NOT NULL THEN
        sort_json := meta -> 'sort';
        search_json := search_json - 'sort';
        v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json));
    END IF;

    IF search_json <> '{}' THEN
        v_search_cls := global.form_table_query(search_json);
        IF v_search_cls IS NOT NULL AND trim(v_search_cls) <> '' THEN
            v_search_cls := regexp_replace(v_search_cls, '^\s*WHERE\s+', '', 'i');
            v_search_cls := replace(v_search_cls, 'article', 'oor.article');
			v_search_cls := replace(v_search_cls, 'l4_name', 'paf.l4_name');
        ELSE
            v_search_cls := '';
        END IF;
    END IF;

    -- Build product_attributes_filter JOIN clause if needed
    IF v_pa_query != '' THEN
        v_pa_join := ' INNER JOIN global.product_attributes_filter paf ON paf.article = oor.article ' || v_pa_query;
    END IF;

    --------------------------------------------------------------------
    -- Build SQL with the new query structure
    --------------------------------------------------------------------
    v_sql := '
WITH
article_map AS (
    SELECT
        oor.article,
        oor.product_code,
        oor.loc_code,
        MIN(oor.demand_start_date) AS demand_start_date,
        COALESCE(MAX(oor.demand_end_date), MIN(oor.demand_start_date)) AS demand_end_date,
        MIN(fdm_start.fiscal_year_week) AS start_fiscal_week,
        COALESCE(MAX(fdm_end.fiscal_year_week), MIN(fdm_start.fiscal_year_week)) AS end_fiscal_week
    FROM inventory_smart.oms_cof_orders_recommended oor' || 
    COALESCE(v_pa_join, '') || '
    LEFT JOIN global.fiscal_date_mapping fdm_start
        ON fdm_start.calendar_date::date = oor.demand_start_date::date
    LEFT JOIN global.fiscal_date_mapping fdm_end
        ON fdm_end.calendar_date::date = COALESCE(oor.demand_end_date, oor.demand_start_date)::date
    WHERE oor.draft_id = ' || quote_literal(draft_id) || 
    COALESCE(v_sa_query, '') || '
    AND oor.is_approved = FALSE
    GROUP BY oor.article, oor.product_code, oor.loc_code
),
timeline_agg AS (
    SELECT
        am.product_code,
        am.loc_code,
        COALESCE(SUM(tvc.dc_inv), 0) AS dc_inv,
        COALESCE(SUM(tvc.predicted_qty), 0) AS predicted_qty,
        COALESCE(SUM(tvc.receipt1), 0) AS receipt1
    FROM article_map am
    LEFT JOIN inventory_smart.oms_cof_timeline_view tvc
        ON tvc.product_code = am.product_code
       AND tvc.loc_code = am.loc_code
       AND tvc.draft_id = ' || quote_literal(draft_id) || '
       AND am.start_fiscal_week IS NOT NULL
       AND am.end_fiscal_week IS NOT NULL
       AND tvc.receipt_week BETWEEN am.start_fiscal_week AND am.end_fiscal_week
    GROUP BY am.product_code, am.loc_code
),
aggregated_data AS (
    SELECT
        oor.article,
        MIN(oor.loc_code) AS loc_code,
        MIN(paf.l0_name) AS l0_name,
        MIN(paf.l1_name) AS l1_name,
        MIN(paf.l2_name) AS l2_name,
        MIN(paf.l3_name) AS l3_name,
        MIN(paf.l4_name) AS l4_name,
        MIN(paf.l6_name) AS l6_name,
        oor.article AS unique_row_id,
        SUM(oor.order_quantity_cof * paf.cost) / NULLIF(SUM(oor.order_quantity_cof), 0)::float4 AS cost,
        SUM(oor.elt_projected_safety_stock_cof) AS elt_projected_safety_stock_cof,
        SUM(oor.raw_roq_cof) AS raw_roq_cof,
        SUM(oor.roq_unconstrained_cof) AS unconstrained_roq,
        SUM(ti.receipt1) AS receipt1,
        SUM(ti.dc_inv) AS dc_inv,
        SUM(ti.predicted_qty) AS predicted_qty,
        SUM(oor.order_quantity_cof * paf.cost) AS order_cost,
        SUM(oor.order_quantity_cof) AS order_quantity_cof,
        MIN(oor.adjusted_delivery_date) AS adjusted_delivery_date,
        MIN(oor.projected_delivery_date) AS projected_delivery_date,
        MIN(oor.min_order_quantity_sku) AS min_order_quantity_sku,
        MIN(oor.min_order_quantity_style_color) AS min_order_quantity_style_color,
        MIN(oor.min_order_quantity_style) AS min_order_quantity_style,
        MIN(oor.order_generation_date) AS order_generation_date,
        MIN(oor.lead_time) AS lead_time,
        MIN(oor.demand_start_date) AS demand_start_date,
        MIN(oor.demand_end_date) AS demand_end_date,
        MIN(oor.demand_twos) AS demand_twos,
        CASE 
            WHEN MIN(oor.buffer_stock_method) IN (''Sell Through'', ''Service Level'') 
            THEN MIN(oor.buffer_stock_method) || ''%''
            ELSE MIN(oor.buffer_stock_method)
        END AS buffer_stock_method,
        MIN(oor.buffer_stock_input) AS buffer_stock_input,
        MAX(oor.updated_at) AS updated_at
    FROM inventory_smart.oms_cof_orders_recommended oor
    LEFT JOIN timeline_agg ti
        ON ti.product_code = oor.product_code
       AND ti.loc_code = oor.loc_code
    JOIN global.product_attributes_filter paf
        ON paf.product_code = oor.product_code' ||
        COALESCE(v_pa_query, '') || '
    WHERE oor.draft_id = ' || quote_literal(draft_id) || 
    COALESCE(v_sa_query, '') || '
    AND oor.is_approved = FALSE
     ' || CASE WHEN v_search_cls IS NOT NULL AND trim(v_search_cls) <> '' THEN ' AND ' || v_search_cls ELSE '' END || '
    GROUP BY oor.article
),
totals AS (
    SELECT
        SUM(ad.order_quantity_cof) AS order_quantity_cof,
        SUM(ad.order_cost) AS order_cost,
        SUM(ad.cost) AS cost,
        SUM(ad.elt_projected_safety_stock_cof) AS elt_projected_safety_stock_cof,
        SUM(ad.unconstrained_roq) AS unconstrained_roq,
        SUM(ad.dc_inv) AS dc_inv,
        SUM(ad.predicted_qty) AS predicted_qty,
        SUM(ad.receipt1) AS receipt1,
        SUM(ad.raw_roq_cof) AS raw_roq_cof
    FROM aggregated_data ad
),
final AS (
    SELECT ad.* FROM aggregated_data ad
    WHERE 1=1
    ' || COALESCE(NULLIF(v_sort_cls, ''), default_sort) || '
    ' || v_limit_cls || '
)
SELECT
    (SELECT jsonb_agg(to_jsonb(final)) FROM final) AS data,
    (SELECT COUNT(*) FROM aggregated_data ad) AS total,
    (SELECT row_to_json(totals) FROM totals) AS grand_total;
';

    RAISE NOTICE 'v_sql: %', v_sql;

    OPEN input FOR EXECUTE v_sql;
    RETURN input;
END;
$function$
;
