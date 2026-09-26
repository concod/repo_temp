--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_v3_get_step3_custom_table_data_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_custom_table_data_v4
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_custom_table_data_v4;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_custom_table_data_v4(_strategy_id integer, _pcd_ids integer[], _product_levels integer[], _store_levels integer[], _strategy_actual_product_levels integer[], _strategy_actual_store_levels integer[], _include_copy_ia boolean, _copy_ia_session_id text, _is_data_changed boolean, _pcd_metrics_filter jsonb, _approval_filter text[], _page_number integer, _number_of_pages integer, _limit integer, _offset integer, _records_filters jsonb, _record_sort_key character varying, _record_sort_order character varying, _alerts_seviority_filter integer[], _alerts_metric_filter integer[])
 RETURNS TABLE(rowid text, is_footer_row boolean, is_row_locked boolean, product_level_id integer, product_level_value jsonb, store_level_id integer, store_level_value jsonb, cw_offer_percentage double precision, min_offer_value double precision, max_offer_value double precision, pcd_metrics jsonb, ia_pcd_metrics jsonb, optimisation_type integer, step_count integer, total_count integer, cw_incremental_discount double precision, cw_effective_price_point double precision, brand text[], division text[], department text[], style text[], color text[], size text[], product_name text[], age double precision, base_price double precision, show_alert boolean, sales_units_diff double precision, ia_discount_next_pcd double precision, upcoming_pcd_id integer, max_alert_severity integer, alert_triggered_case text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    vl_test_query text;
    vl_data_offset int;
    vl_output_limit int;
    vl_where_condition varchar[];
    vl_sort_order varchar[];
    vl_where_condition_string text;
    vl_order_by_string text;
    vl_total_count int;
    vl_end_rule real;
    _client_timezone text;

    -- Dynamic column building
    vl_product_jsonb_select text;
    vl_product_group_by text;
    vl_store_jsonb_select text;
    vl_store_group_by text;
    vl_finest_product_level int;
    vl_finest_store_level int;
    lvl int;

    vl_pcd_metric_filter jsonb;
    vl_pcd_metric text;
    vl_pcd_metric_value jsonb;
    filter_record record;
    curr_filter text;
    curr_value jsonb;
BEGIN
    -- Compute offset/limit
    if _offset is null then
        vl_data_offset := (_page_number - 1) * _limit;
    else
        vl_data_offset := _offset;
    end if;
    vl_output_limit := _limit * _number_of_pages;

    -- Get ending rule
    SELECT unnest(t1.applicable_value) INTO vl_end_rule
    FROM price_markdown.tb_strategy_rule t1
    JOIN price_markdown.tb_rule_master t2 ON t1.constraint_id = t2.rule_id
    WHERE strategy_id = _strategy_id AND constraint_type = 0 AND status = 0 AND rule_type = 44
    LIMIT 1;

    _client_timezone := (SELECT remarks FROM metaschema.tb_app_sub_master WHERE name = 'client_timezone');

    -- Build dynamic product_level_value JSONB and GROUP BY from _product_levels
    -- e.g. _product_levels = [5] → jsonb_build_object('l5_cid', pm.l5_cid, 'l5_cuq', pm.l5_cuq)
    -- GROUP BY pm.l5_cid, pm.l5_cuq
    vl_product_jsonb_select := 'jsonb_build_object(';
    vl_product_group_by := '';
    vl_finest_product_level := _product_levels[array_upper(_product_levels, 1)];

    FOR i IN 1..array_length(_product_levels, 1) LOOP
        lvl := _product_levels[i];
        if i > 1 then
            vl_product_jsonb_select := vl_product_jsonb_select || ', ';
            vl_product_group_by := vl_product_group_by || ', ';
        end if;
        vl_product_jsonb_select := vl_product_jsonb_select ||
            format('''l%1$s_cid'', pm.l%1$s_cid, ''l%1$s_cuq'', pm.l%1$s_cuq', lvl);
        vl_product_group_by := vl_product_group_by ||
            format('pm.l%1$s_cid, pm.l%1$s_cuq', lvl);
    END LOOP;
    vl_product_jsonb_select := vl_product_jsonb_select || ')';

    -- Build dynamic store_level_value JSONB and GROUP BY from _store_levels
    vl_store_jsonb_select := 'jsonb_build_object(';
    vl_store_group_by := '';
    vl_finest_store_level := _store_levels[array_upper(_store_levels, 1)];

    FOR i IN 1..array_length(_store_levels, 1) LOOP
        lvl := _store_levels[i];
        if i > 1 then
            vl_store_jsonb_select := vl_store_jsonb_select || ', ';
            vl_store_group_by := vl_store_group_by || ', ';
        end if;
        vl_store_jsonb_select := vl_store_jsonb_select ||
            format('''s%1$s_id'', sm.s%1$s_id, ''s%1$s_name'', sm.s%1$s_name', lvl);
        vl_store_group_by := vl_store_group_by ||
            format('sm.s%1$s_id, sm.s%1$s_name', lvl);
    END LOOP;
    vl_store_jsonb_select := vl_store_jsonb_select || ')';

    raise notice 'product_jsonb_select: %', vl_product_jsonb_select;
    raise notice 'store_jsonb_select: %', vl_store_jsonb_select;
    raise notice 'finest product level: %, finest store level: %', vl_finest_product_level, vl_finest_store_level;

    -- Build filter conditions from _records_filters
    if _records_filters is not null then
        for filter_record in select * from jsonb_each(_records_filters)
        loop
            curr_filter = filter_record.key;
            curr_value = filter_record.value;

            IF curr_filter = ANY (ARRAY['brand', 'department', 'division', 'style', 'color', 'size', 'product_name']) THEN
                curr_filter := 'array_to_string(' || curr_filter || ', '','')';
            end if;
            if curr_value->>'value1' is not null then
                vl_where_condition := array_append(
                    vl_where_condition,
                    global.fn_generate_filter_condition_for_int(
                        curr_filter,
                        curr_value->>'operator',
                        curr_value->>'value1',
                        curr_value->>'value2'
                    )
                );
            else
                vl_where_condition := array_append(
                    vl_where_condition,
                    global.fn_generate_filter_condition_for_string(
                        format('lower(%1$s)', curr_filter),
                        curr_value->>'operator',
                        lower(curr_value->>'value')
                    )
                );
            end if;
        end loop;
    end if;

    -- Build PCD metrics filter conditions
    if _pcd_metrics_filter is not null then
        for vl_pcd_metric, vl_pcd_metric_value in select * from jsonb_each(_pcd_metrics_filter) loop
            if vl_pcd_metric_value->>'value' is not null then
                vl_where_condition := array_append(
                    vl_where_condition,
                    global.fn_generate_filter_condition_for_string(
                        format(
                            'lower((pcd_metrics->>''%1$s'')::jsonb->>''%2$s'')',
                            (regexp_match(vl_pcd_metric, '^([0-9]+)'))[1],
                            (regexp_match(vl_pcd_metric, '^[0-9]+_(.*)'))[1]
                        ),
                        vl_pcd_metric_value->>'operator',
                        lower(vl_pcd_metric_value->>'value')
                    )
                );
            else
                vl_where_condition := array_append(
                    vl_where_condition,
                    global.fn_generate_filter_condition_for_int(
                        format(
                            ' round(((pcd_metrics->>''%1$s'')::jsonb->>''%2$s'')::numeric,2) ',
                            (regexp_match(vl_pcd_metric, '^([0-9]+)'))[1],
                            (regexp_match(vl_pcd_metric, '^[0-9]+_(.*)'))[1]
                        ),
                        vl_pcd_metric_value->>'operator',
                        vl_pcd_metric_value->>'value1',
                        vl_pcd_metric_value->>'value2'
                    )
                );
            end if;
        end loop;
    end if;

    -- Build sort order
    if _record_sort_key is not null then
        vl_sort_order := array_append(vl_sort_order, ' Order by ');
        if _record_sort_key ~ '^[0-9]+_' then
            vl_sort_order := array_append(
                vl_sort_order,
                ' ((pcd_metrics->>''' ||
                (regexp_match(_record_sort_key, '^([0-9]+)'))[1]
                || ''')::jsonb->>''' ||
                (regexp_match(_record_sort_key, '^[0-9]+_(.*)'))[1]
                || ''')::numeric'
            );
        else
            vl_sort_order := array_append(vl_sort_order, _record_sort_key);
        end if;
        vl_sort_order := array_append(vl_sort_order, _record_sort_order);
    else
        vl_sort_order := array_append(vl_sort_order, ' Order by product_level_value, store_level_value');
    end if;

    if array_length(vl_where_condition, 1) > 0 then
        vl_where_condition_string := ' where ' || array_to_string(vl_where_condition, ' and ');
    end if;

    if array_length(vl_sort_order, 1) > 0 then
        vl_order_by_string := array_to_string(vl_sort_order, ' ');
    end if;

    -- Main query: re-aggregate from tb_ssd_fin/tb_ssd_ia at custom levels
    vl_test_query := format('
        WITH
        pcd_info AS (
            SELECT
                pcd_id,
                order_number,
                pcd_start_date,
                pcd_end_date,
                lead(order_number) OVER (ORDER BY pcd_start_date) AS next_order_number,
                lag(order_number) OVER (ORDER BY pcd_start_date) AS prev_order_number
            FROM price_markdown.tb_strategy_pcd_new
            WHERE strategy_id = %1$s
        ),

        -- SKU-store mapping with product_master and store_master for custom level columns
        sku_with_levels AS (
            SELECT
                ssm.product_id,
                ssm.store_id,
                ssm.product_level_id AS reco_product_level_id,
                ssm.store_level_id AS reco_store_level_id,
                ssm.channel_info,
                pm.l%2$s_cid AS custom_product_level_id,
                %3$s AS custom_product_level_value,
                sm.s%4$s_id AS custom_store_level_id,
                %5$s AS custom_store_level_value,
                pm.l0_cuq AS brand_val,
                pm.l1_cuq AS division_val,
                pm.l2_cuq AS department_val,
                pm.l5_cuq AS style_val,
                pm.l6_cuq AS color_val,
                pm.l7_cuq AS size_val,
                pm.product_name AS product_name_val,
                pm.max_age, pm.store_age, pm.ecom_age
            FROM price_markdown.tb_strategy_sku_store_mapping ssm
            JOIN price_markdown.product_master pm ON ssm.product_id = pm.product_id
            JOIN price_markdown.tb_store_master sm ON ssm.store_id = sm.store_id
            WHERE ssm.strategy_id = %1$s
        ),

        -- BL discount data exploded from tb_strategy_discount_level
        bl_discount AS (
            SELECT
                swl.custom_product_level_id,
                swl.custom_store_level_id,
                pi.pcd_id,
                pi.order_number,
                pi.next_order_number,
                pi.prev_order_number,
                avg((pcd_entry.value->>''markdown_percentage'')::float8) AS markdown_percentage,
                min((pcd_entry.value->>''is_locked'')::int) AS is_locked,
                avg((pcd_entry.value->>''incremental_discount'')::float8) AS incremental_discount,
                coalesce(
                    min(pcd_entry.value->>''approval_status''),
                    ''Not Approved''
                )::price_markdown.strategy_approval_status_enum AS approval_status,
                avg((pcd_entry.value->>''average_retail_price'')::float8) AS average_retail_price
            FROM price_markdown.tb_strategy_discount_level_%1$s dl
            CROSS JOIN LATERAL jsonb_each(dl.pcd_data) AS pcd_entry(key, value)
            JOIN pcd_info pi ON pi.order_number = pcd_entry.key::int
            JOIN (
                SELECT DISTINCT reco_product_level_id, reco_store_level_id,
                       custom_product_level_id, custom_store_level_id
                FROM sku_with_levels
            ) swl ON dl.product_level_id = swl.reco_product_level_id
                 AND dl.store_level_id = swl.reco_store_level_id
            GROUP BY swl.custom_product_level_id, swl.custom_store_level_id,
                     pi.pcd_id, pi.order_number, pi.next_order_number, pi.prev_order_number
        ),

        -- IA discount data exploded
        ia_discount AS (
            SELECT
                swl.custom_product_level_id,
                swl.custom_store_level_id,
                pi.pcd_id,
                pi.order_number,
                avg((pcd_entry.value->>''ia_markdown_percentage'')::float8) AS ia_markdown_percentage,
                avg((pcd_entry.value->>''ia_incremental_discount'')::float8) AS ia_incremental_discount
            FROM price_markdown.tb_strategy_discount_level_%1$s dl
            CROSS JOIN LATERAL jsonb_each(dl.ia_pcd_data) AS pcd_entry(key, value)
            JOIN pcd_info pi ON pi.order_number = pcd_entry.key::int
            JOIN (
                SELECT DISTINCT reco_product_level_id, reco_store_level_id,
                       custom_product_level_id, custom_store_level_id
                FROM sku_with_levels
            ) swl ON dl.product_level_id = swl.reco_product_level_id
                 AND dl.store_level_id = swl.reco_store_level_id
            WHERE dl.ia_pcd_data IS NOT NULL
            GROUP BY swl.custom_product_level_id, swl.custom_store_level_id,
                     pi.pcd_id, pi.order_number
        ),

        -- BL financials from tb_ssd_fin re-aggregated at custom level
        bl_fin AS (
            SELECT
                swl.custom_product_level_id,
                swl.custom_store_level_id,
                fin.pcd_id,
                CASE WHEN SUM(fin.sales_units) > 0
                    THEN SUM(fin.effective_price_point * fin.sales_units) / SUM(fin.sales_units)
                    ELSE AVG(fin.effective_price_point)
                END AS selling_price,
                round(sum(fin.sales_units)::decimal, 2) AS sales_units,
                round(sum(fin.margin)::decimal, 2) AS margin,
                round(sum(fin.revenue)::decimal, 2) AS revenue,
                coalesce(
                    sum(fin.rem_inv) FILTER (WHERE fin.recommendation_date = pi.pcd_end_date), 0
                ) + round(sum(fin.sales_units)::decimal, 2) AS inventory,
                round(sum(fin.spend)::decimal, 2) AS markdown_dollar
            FROM price_markdown.tb_ssd_fin fin
            JOIN sku_with_levels swl ON fin.product_id = swl.product_id AND fin.store_id = swl.store_id
            JOIN pcd_info pi ON fin.pcd_id = pi.pcd_id
            WHERE fin.strategy_id = %1$s
            GROUP BY swl.custom_product_level_id, swl.custom_store_level_id, fin.pcd_id, pi.pcd_end_date
        ),

        bl_computed AS (
            SELECT
                bf.custom_product_level_id, bf.custom_store_level_id, bf.pcd_id,
                bf.sales_units, bf.margin, bf.revenue, bf.inventory, bf.markdown_dollar,
                CASE WHEN %6$s IS NULL
                    THEN round(bf.selling_price::numeric, 2)
                    ELSE round((bf.selling_price - %6$s / 100)::numeric, 1) + %6$s / 100
                END AS effective_price_point,
                CASE WHEN bf.inventory = 0 THEN 0
                    ELSE (bf.sales_units * 100) / bf.inventory
                END AS sell_through
            FROM bl_fin bf
        ),

        -- IA financials from tb_ssd_ia re-aggregated at custom level
        ia_fin AS (
            SELECT
                swl.custom_product_level_id,
                swl.custom_store_level_id,
                ia.pcd_id,
                CASE WHEN SUM(ia.sales_units) > 0
                    THEN SUM(ia.effective_price_point * ia.sales_units) / SUM(ia.sales_units)
                    ELSE AVG(ia.effective_price_point)
                END AS ia_selling_price,
                round(sum(ia.sales_units)::decimal, 2) AS ia_sales_units,
                round(sum(ia.margin)::decimal, 2) AS ia_margin,
                round(sum(ia.revenue)::decimal, 2) AS ia_revenue,
                coalesce(
                    sum(ia.rem_inv) FILTER (WHERE ia.recommendation_date = pi.pcd_end_date), 0
                ) + round(sum(ia.sales_units)::decimal, 2) AS ia_inventory,
                round(sum(ia.spend)::decimal, 2) AS ia_markdown_dollar
            FROM price_markdown.tb_ssd_ia ia
            JOIN sku_with_levels swl ON ia.product_id = swl.product_id AND ia.store_id = swl.store_id
            JOIN pcd_info pi ON ia.pcd_id = pi.pcd_id
            WHERE ia.strategy_id = %1$s
            GROUP BY swl.custom_product_level_id, swl.custom_store_level_id, ia.pcd_id, pi.pcd_end_date
        ),

        ia_computed AS (
            SELECT
                iaf.custom_product_level_id, iaf.custom_store_level_id, iaf.pcd_id,
                iaf.ia_sales_units, iaf.ia_margin, iaf.ia_revenue,
                iaf.ia_inventory, iaf.ia_markdown_dollar,
                CASE WHEN %6$s IS NULL
                    THEN round(iaf.ia_selling_price::numeric, 2)
                    ELSE round((iaf.ia_selling_price - %6$s / 100)::numeric, 1) + %6$s / 100
                END AS ia_effective_price_point,
                CASE WHEN iaf.ia_inventory = 0 THEN 0
                    ELSE (iaf.ia_sales_units * 100) / iaf.ia_inventory
                END AS ia_sell_through
            FROM ia_fin iaf
        ),

        -- Current-week PCD
        current_pcd AS (
            SELECT pcd_id, order_number
            FROM pcd_info
            WHERE date(timezone(%7$L, now())) BETWEEN pcd_start_date AND pcd_end_date
            LIMIT 1
        ),

        -- Current-week discount at custom level
        current_week AS (
            SELECT
                bd.custom_product_level_id,
                bd.custom_store_level_id,
                round(avg(bd.markdown_percentage)::decimal, 2) AS cw_offer_percentage,
                round(avg(bd.incremental_discount)::decimal, 2) AS cw_incremental_discount,
                round(avg(bc.effective_price_point)::decimal, 2) AS cw_effective_price_point
            FROM bl_discount bd
            LEFT JOIN bl_computed bc
                ON bd.custom_product_level_id = bc.custom_product_level_id
                AND bd.custom_store_level_id = bc.custom_store_level_id
                AND bd.pcd_id = bc.pcd_id
            WHERE bd.pcd_id = (SELECT pcd_id FROM current_pcd)
            GROUP BY bd.custom_product_level_id, bd.custom_store_level_id
        ),

        -- Product attributes at custom level
        product_attrs AS (
            SELECT
                custom_product_level_id,
                custom_store_level_id,
                array_agg(DISTINCT brand_val) AS brand,
                array_agg(DISTINCT division_val) AS division,
                array_agg(DISTINCT department_val) AS department,
                array_agg(DISTINCT style_val) AS style,
                array_agg(DISTINCT color_val) AS color,
                array_agg(DISTINCT size_val) AS size,
                array_agg(DISTINCT product_name_val) AS product_name,
                CASE
                    WHEN min(channel_info) = ''Omni'' THEN avg(max_age)
                    WHEN min(channel_info) = ''Store'' THEN avg(store_age)
                    ELSE avg(ecom_age)
                END AS age
            FROM sku_with_levels
            GROUP BY custom_product_level_id, custom_store_level_id
        ),

        -- Per-PCD metrics at custom level
        per_pcd_metrics AS (
            SELECT
                bd.custom_product_level_id,
                bd.custom_store_level_id,
                bd.order_number,
                jsonb_build_object(
                    ''pcd_id'', bd.pcd_id,
                    ''finalized_discount_percent'', bd.markdown_percentage,
                    ''finalized_pp'', coalesce(
                        round(bc.effective_price_point::numeric, 2),
                        round(((100 - bd.markdown_percentage) * bd.average_retail_price / 100)::numeric, 2)
                    ),
                    ''margin_finalized'', bc.margin,
                    ''revenue_finalized'', bc.revenue,
                    ''unit_finalized'', bc.sales_units,
                    ''incremental_discount'', bd.incremental_discount,
                    ''approval_status'', bd.approval_status,
                    ''is_locked'', bd.is_locked,
                    ''enable_lock'', false,
                    ''finalized_is_locked'', false,
                    ''finalized_inventory'', bc.inventory,
                    ''finalized_markdown_dollar'', bc.markdown_dollar,
                    ''finalized_sell_through'', bc.sell_through,
                    ''next_pcd'', bd.next_order_number,
                    ''previous_pcd'', bd.prev_order_number
                ) AS bl_pcd_metric,
                jsonb_build_object(
                    ''pcd_id'', bd.pcd_id,
                    ''ia_reco_discount_percent'', iad.ia_markdown_percentage,
                    ''ia_reco_pp'', coalesce(
                        round(iac.ia_effective_price_point::numeric, 2),
                        round(((100 - iad.ia_markdown_percentage) * bd.average_retail_price / 100)::numeric, 2)
                    ),
                    ''unit_ia_reco'', iac.ia_sales_units,
                    ''margin_ia_reco'', iac.ia_margin,
                    ''revenue_ia_reco'', iac.ia_revenue,
                    ''ia_incremental_discount'', iad.ia_incremental_discount,
                    ''ia_inventory'', iac.ia_inventory,
                    ''ia_markdown_dollar'', iac.ia_markdown_dollar,
                    ''ia_sell_through'', iac.ia_sell_through
                ) AS ia_pcd_metric
            FROM bl_discount bd
            LEFT JOIN bl_computed bc
                ON bd.custom_product_level_id = bc.custom_product_level_id
                AND bd.custom_store_level_id = bc.custom_store_level_id
                AND bd.pcd_id = bc.pcd_id
            LEFT JOIN ia_discount iad
                ON bd.custom_product_level_id = iad.custom_product_level_id
                AND bd.custom_store_level_id = iad.custom_store_level_id
                AND bd.order_number = iad.order_number
            LEFT JOIN ia_computed iac
                ON bd.custom_product_level_id = iac.custom_product_level_id
                AND bd.custom_store_level_id = iac.custom_store_level_id
                AND bd.pcd_id = iac.pcd_id
        ),

        -- Aggregate to one row per (custom_product_level_id, custom_store_level_id)
        aggregated AS (
            SELECT
                ppm.custom_product_level_id::text || ''_'' || ppm.custom_store_level_id::text AS rowid,
                false AS is_footer_row,
                false AS is_row_locked,
                ppm.custom_product_level_id,
                (SELECT custom_product_level_value FROM sku_with_levels swl
                 WHERE swl.custom_product_level_id = ppm.custom_product_level_id LIMIT 1) AS product_level_value,
                ppm.custom_store_level_id,
                (SELECT custom_store_level_value FROM sku_with_levels swl
                 WHERE swl.custom_store_level_id = ppm.custom_store_level_id LIMIT 1) AS store_level_value,
                cw.cw_offer_percentage,
                cw.cw_incremental_discount,
                cw.cw_effective_price_point,
                jsonb_object_agg(ppm.order_number::text, ppm.bl_pcd_metric) AS pcd_metrics,
                jsonb_object_agg(ppm.order_number::text, ppm.ia_pcd_metric) AS ia_pcd_metrics,
                pa.brand, pa.division, pa.department, pa.style, pa.color, pa.size,
                pa.product_name, pa.age,
                round(avg(bd_base.average_retail_price)::decimal, 2)::float8 AS base_price
            FROM per_pcd_metrics ppm
            LEFT JOIN product_attrs pa
                ON ppm.custom_product_level_id = pa.custom_product_level_id
                AND ppm.custom_store_level_id = pa.custom_store_level_id
            LEFT JOIN current_week cw
                ON ppm.custom_product_level_id = cw.custom_product_level_id
                AND ppm.custom_store_level_id = cw.custom_store_level_id
            LEFT JOIN bl_discount bd_base
                ON ppm.custom_product_level_id = bd_base.custom_product_level_id
                AND ppm.custom_store_level_id = bd_base.custom_store_level_id
                AND bd_base.order_number = 1
            GROUP BY
                ppm.custom_product_level_id, ppm.custom_store_level_id,
                cw.cw_offer_percentage, cw.cw_incremental_discount, cw.cw_effective_price_point,
                pa.brand, pa.division, pa.department, pa.style, pa.color, pa.size,
                pa.product_name, pa.age
        ),

        -- Footer row
        footer AS (
            SELECT
                ''Sub total'' AS rowid,
                true AS is_footer_row,
                false AS is_row_locked,
                null::int AS custom_product_level_id,
                null::jsonb AS product_level_value,
                null::int AS custom_store_level_id,
                null::jsonb AS store_level_value,
                null::float8 AS cw_offer_percentage,
                null::float8 AS cw_incremental_discount,
                null::float8 AS cw_effective_price_point,
                -- BL footer
                (SELECT jsonb_object_agg(key, agg_value)
                 FROM (
                    SELECT kv.key,
                        jsonb_build_object(
                            ''finalized_discount_percent'', round(avg((kv.value->>''finalized_discount_percent'')::float8)::numeric, 0),
                            ''finalized_pp'', round(avg((kv.value->>''finalized_pp'')::float8)::numeric, 2),
                            ''margin_finalized'', round(sum((kv.value->>''margin_finalized'')::float8)::decimal, 2),
                            ''revenue_finalized'', round(sum((kv.value->>''revenue_finalized'')::float8)::decimal, 2),
                            ''unit_finalized'', round(sum((kv.value->>''unit_finalized'')::float8)::decimal, 2),
                            ''finalized_inventory'', sum((kv.value->>''finalized_inventory'')::float8),
                            ''finalized_markdown_dollar'', sum((kv.value->>''finalized_markdown_dollar'')::float8),
                            ''finalized_sell_through'', avg((kv.value->>''finalized_sell_through'')::float8)
                        ) AS agg_value
                    FROM aggregated a2
                    CROSS JOIN LATERAL jsonb_each(a2.pcd_metrics) AS kv(key, value)
                    GROUP BY kv.key
                 ) per_pcd) AS pcd_metrics,
                -- IA footer
                (SELECT jsonb_object_agg(key, agg_value)
                 FROM (
                    SELECT kv.key,
                        jsonb_build_object(
                            ''ia_reco_discount_percent'', round(avg((kv.value->>''ia_reco_discount_percent'')::float8)::numeric, 0),
                            ''ia_reco_pp'', round(avg((kv.value->>''ia_reco_pp'')::float8)::numeric, 2),
                            ''unit_ia_reco'', round(sum((kv.value->>''unit_ia_reco'')::float8)::decimal, 2),
                            ''margin_ia_reco'', round(sum((kv.value->>''margin_ia_reco'')::float8)::decimal, 2),
                            ''revenue_ia_reco'', round(sum((kv.value->>''revenue_ia_reco'')::float8)::decimal, 2),
                            ''ia_inventory'', sum((kv.value->>''ia_inventory'')::float8),
                            ''ia_markdown_dollar'', sum((kv.value->>''ia_markdown_dollar'')::float8),
                            ''ia_sell_through'', avg((kv.value->>''ia_sell_through'')::float8)
                        ) AS agg_value
                    FROM aggregated a2
                    CROSS JOIN LATERAL jsonb_each(a2.ia_pcd_metrics) AS kv(key, value)
                    GROUP BY kv.key
                 ) per_pcd) AS ia_pcd_metrics,
                null::text[] AS brand, null::text[] AS division, null::text[] AS department,
                null::text[] AS style, null::text[] AS color, null::text[] AS size,
                null::text[] AS product_name, null::float8 AS age, null::float8 AS base_price
        ),

        -- Combined with filters
        final_result AS (
            SELECT * FROM aggregated
            %8$s
        )

        SELECT * FROM (
            SELECT
                tbl2.rowid,
                tbl2.is_footer_row,
                tbl2.is_row_locked,
                tbl2.custom_product_level_id AS product_level_id,
                tbl2.product_level_value,
                tbl2.custom_store_level_id AS store_level_id,
                tbl2.store_level_value,
                tbl2.cw_offer_percentage,
                null::float8 AS min_offer_value,
                null::float8 AS max_offer_value,
                tbl2.pcd_metrics,
                tbl2.ia_pcd_metrics,
                null::integer AS optimisation_type,
                null::integer AS step_count,
                (SELECT count(*) FROM final_result)::int AS total_count,
                tbl2.cw_incremental_discount,
                tbl2.cw_effective_price_point,
                tbl2.brand, tbl2.division, tbl2.department,
                tbl2.style, tbl2.color, tbl2.size,
                tbl2.product_name, tbl2.age, tbl2.base_price,
                null::boolean AS show_alert,
                null::float8 AS sales_units_diff,
                null::float8 AS ia_discount_next_pcd,
                null::integer AS upcoming_pcd_id,
                null::integer AS max_alert_severity,
                null::text AS alert_triggered_case
            FROM final_result tbl2
            %9$s
            LIMIT %10$s OFFSET %11$s
        ) s
        UNION ALL
        SELECT * FROM (
            SELECT
                f.rowid,
                f.is_footer_row,
                f.is_row_locked,
                f.custom_product_level_id AS product_level_id,
                f.product_level_value,
                f.custom_store_level_id AS store_level_id,
                f.store_level_value,
                f.cw_offer_percentage,
                null::float8 AS min_offer_value,
                null::float8 AS max_offer_value,
                f.pcd_metrics,
                f.ia_pcd_metrics,
                sm.optimisation_type,
                sm.step_count,
                (SELECT count(*) FROM final_result)::int AS total_count,
                f.cw_incremental_discount,
                f.cw_effective_price_point,
                f.brand, f.division, f.department,
                f.style, f.color, f.size,
                f.product_name, f.age, f.base_price,
                null::boolean AS show_alert,
                null::float8 AS sales_units_diff,
                null::float8 AS ia_discount_next_pcd,
                null::integer AS upcoming_pcd_id,
                null::integer AS max_alert_severity,
                null::text AS alert_triggered_case
            FROM footer f
            CROSS JOIN (SELECT step_count, optimisation_type FROM price_markdown.tb_strategy_master WHERE strategy_id = %1$s) sm
        ) s
        ORDER BY is_footer_row
    ',
        _strategy_id,                       -- %1$s
        vl_finest_product_level,            -- %2$s
        vl_product_jsonb_select,            -- %3$s
        vl_finest_store_level,              -- %4$s
        vl_store_jsonb_select,              -- %5$s
        vl_end_rule,                        -- %6$s
        _client_timezone,                   -- %7$L (quoted literal)
        coalesce(vl_where_condition_string, ''),  -- %8$s (where condition)
        coalesce(vl_order_by_string, ''),   -- %9$s (sort order)
        vl_output_limit,                    -- %10$s (limit)
        vl_data_offset                      -- %11$s (offset)
    );

    raise notice 'Custom v4 query: %', left(vl_test_query, 500);

    return query execute vl_test_query;
END;
$function$
;
