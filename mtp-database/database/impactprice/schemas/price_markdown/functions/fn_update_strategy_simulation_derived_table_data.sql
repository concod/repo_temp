--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_update_strategy_simulation_derived_table_data_11 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_update_strategy_simulation_derived_table_data_11
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_update_strategy_simulation_derived_table_data;


CREATE OR REPLACE FUNCTION price_markdown.fn_update_strategy_simulation_derived_table_data(p_strategy_id integer, p_product_and_store_levels jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

declare
	vl_end_rule real;
    _client_timezone text;
	vl_test_query text;

begin

    -- If step4 table does not exist, do a full refresh via fn_populate_step4_data_v4
    if not exists(
            select 1 from information_schema.tables
            where table_schema='price_markdown_temp' and
            table_name=format('tb_strategy_step4_full_%1$s',p_strategy_id)
        ) then
        perform price_markdown.fn_populate_step4_data_v4(p_strategy_id);
        return;
    end if;

	SELECT unnest(t1.applicable_value) INTO vl_end_rule
    FROM price_markdown.tb_strategy_rule t1
    JOIN price_markdown.tb_rule_master t2 ON t1.constraint_id = t2.rule_id
    WHERE strategy_id = p_strategy_id AND constraint_type = 0 AND status = 0 AND rule_type = 44
    LIMIT 1;
	raise notice 'vl_end_rule -- %' , vl_end_rule;

    _client_timezone = (select remarks from metaschema.tb_app_sub_master where name = 'client_timezone');

    -- Build temp table of affected product/store combos
    drop table if exists tmp_selected_product_and_store_levels;
    create temp table tmp_selected_product_and_store_levels as
    select product_level_id,store_level_id
    from jsonb_to_recordset(
        p_product_and_store_levels
    ) as product_and_store_levels(
        product_level_id int,
        store_level_id int
    );

    -- Delete affected rows from step4 table
    execute format('
        delete from price_markdown_temp.tb_strategy_step4_full_%1$s
        where (product_level_id,store_level_id) in (
            select product_level_id,store_level_id from
            tmp_selected_product_and_store_levels
        )
        ',
        p_strategy_id
    );

    -- Rebuild only the affected rows using discount_level JSONB + reco_details + v4 schema
    vl_test_query := format('
        INSERT INTO price_markdown_temp.tb_strategy_step4_full_%1$s
        (rowid, order_, is_footer_row, is_row_locked, product_level_id, product_level_value,
         store_level_id, store_level_value, cw_offer_percentage, cw_incremental_discount,
         cw_effective_price_point, pcd_metrics, ia_pcd_metrics, brand, division, department,
         style, color, size, product_name, age, base_price, show_alert, sales_units_diff,
         ia_discount_next_pcd, upcoming_pcd_id)
        WITH
        pcd_info AS (
            SELECT
                pcd_id, order_number, pcd_start_date, pcd_end_date,
                lead(order_number) OVER (ORDER BY pcd_start_date) AS next_order_number,
                lag(order_number) OVER (ORDER BY pcd_start_date) AS prev_order_number
            FROM price_markdown.tb_strategy_pcd_new
            WHERE strategy_id = %1$s
        ),

        bl_exploded AS (
            SELECT
                dl.product_level_id, dl.store_level_id,
                pi.pcd_id, pi.order_number, pi.pcd_start_date, pi.pcd_end_date,
                pi.next_order_number, pi.prev_order_number,
                (pcd_entry.value->>''markdown_percentage'')::float8 AS markdown_percentage,
                (pcd_entry.value->>''is_locked'')::int AS is_locked,
                (pcd_entry.value->>''incremental_discount'')::float8 AS incremental_discount,
                coalesce(
                    pcd_entry.value->>''approval_status'',
                    ''Not Approved''
                )::price_markdown.strategy_approval_status_enum AS approval_status,
                (pcd_entry.value->>''average_retail_price'')::float8 AS average_retail_price,
                (pcd_entry.value->>''previous_markdown_percentage'')::float8 AS previous_markdown_percentage
            FROM price_markdown.tb_strategy_discount_level_%1$s dl
            CROSS JOIN LATERAL jsonb_each(dl.pcd_data) AS pcd_entry(key, value)
            JOIN pcd_info pi ON pi.order_number = pcd_entry.key::int
            WHERE (dl.product_level_id, dl.store_level_id) IN (
                SELECT product_level_id, store_level_id FROM tmp_selected_product_and_store_levels
            )
        ),

        ia_exploded AS (
            SELECT
                dl.product_level_id, dl.store_level_id,
                pi.pcd_id, pi.order_number,
                (pcd_entry.value->>''ia_markdown_percentage'')::float8 AS ia_markdown_percentage,
                (pcd_entry.value->>''ia_incremental_discount'')::float8 AS ia_incremental_discount,
                (pcd_entry.value->>''ia_previous_markdown_percentage'')::float8 AS ia_previous_markdown_percentage
            FROM price_markdown.tb_strategy_discount_level_%1$s dl
            CROSS JOIN LATERAL jsonb_each(dl.ia_pcd_data) AS pcd_entry(key, value)
            JOIN pcd_info pi ON pi.order_number = pcd_entry.key::int
            WHERE dl.ia_pcd_data IS NOT NULL
              AND (dl.product_level_id, dl.store_level_id) IN (
                  SELECT product_level_id, store_level_id FROM tmp_selected_product_and_store_levels
              )
        ),

        product_attrs AS (
            SELECT
                tssm.product_level_id, tssm.store_level_id,
                array_agg(DISTINCT pm.l0_cuq) AS brand,
                array_agg(DISTINCT pm.l1_cuq) AS division,
                array_agg(DISTINCT pm.l2_cuq) AS department,
                array_agg(DISTINCT pm.l5_cuq) AS style,
                array_agg(DISTINCT pm.l6_cuq) AS color,
                array_agg(DISTINCT pm.l7_cuq) AS size,
                array_agg(DISTINCT pm.product_name) AS product_name,
                CASE
                    WHEN tssm.channel_info = ''Omni'' THEN avg(pm.max_age)
                    WHEN tssm.channel_info = ''Store'' THEN avg(pm.store_age)
                    ELSE avg(pm.ecom_age)
                END AS age
            FROM price_markdown.tb_strategy_sku_store_mapping tssm
            JOIN pricesmart.product_master pm ON tssm.product_id = pm.product_id
            WHERE tssm.strategy_id = %1$s
              AND (tssm.product_level_id, tssm.store_level_id) IN (
                  SELECT product_level_id, store_level_id FROM tmp_selected_product_and_store_levels
              )
            GROUP BY tssm.product_level_id, tssm.store_level_id, tssm.channel_info
        ),

        fin_agg AS (
            SELECT
                fin.pcd_id, fin.product_level_id, fin.store_level_id,
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
            FROM price_markdown.tb_agg_fin fin
            JOIN pcd_info pi ON fin.pcd_id = pi.pcd_id
            WHERE fin.strategy_id = %1$s
              AND (fin.product_level_id, fin.store_level_id) IN (
                  SELECT product_level_id, store_level_id FROM tmp_selected_product_and_store_levels
              )
            GROUP BY fin.pcd_id, fin.product_level_id, fin.store_level_id
        ),

        bl_computed AS (
            SELECT
                fa.pcd_id, fa.product_level_id, fa.store_level_id,
                fa.sales_units, fa.margin, fa.revenue, fa.inventory, fa.markdown_dollar,
                CASE WHEN %2$s IS NULL
                    THEN round(fa.selling_price::numeric, 2)
                    ELSE round((fa.selling_price - %2$s / 100)::numeric, 1) + %2$s / 100
                END AS effective_price_point,
                CASE WHEN fa.inventory = 0 THEN 0
                    ELSE (fa.sales_units * 100) / fa.inventory
                END AS sell_through
            FROM fin_agg fa
        ),

        ia_agg AS (
            SELECT
                ia.pcd_id, ia.product_level_id, ia.store_level_id,
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
            FROM price_markdown.tb_agg_ia ia
            JOIN pcd_info pi ON ia.pcd_id = pi.pcd_id
            WHERE ia.strategy_id = %1$s
              AND (ia.product_level_id, ia.store_level_id) IN (
                  SELECT product_level_id, store_level_id FROM tmp_selected_product_and_store_levels
              )
            GROUP BY ia.pcd_id, ia.product_level_id, ia.store_level_id
        ),

        ia_computed AS (
            SELECT
                ia.pcd_id, ia.product_level_id, ia.store_level_id,
                ia.ia_sales_units, ia.ia_margin, ia.ia_revenue,
                ia.ia_inventory, ia.ia_markdown_dollar,
                CASE WHEN %2$s IS NULL
                    THEN round(ia.ia_selling_price::numeric, 2)
                    ELSE round((ia.ia_selling_price - %2$s / 100)::numeric, 1) + %2$s / 100
                END AS ia_effective_price_point,
                CASE WHEN ia.ia_inventory = 0 THEN 0
                    ELSE (ia.ia_sales_units * 100) / ia.ia_inventory
                END AS ia_sell_through
            FROM ia_agg ia
        ),

        current_pcd AS (
            SELECT pcd_id, order_number
            FROM pcd_info
            WHERE date(timezone(%3$L, now())) BETWEEN pcd_start_date AND pcd_end_date
            LIMIT 1
        ),

        current_week AS (
            SELECT
                bl.product_level_id, bl.store_level_id,
                round(bl.markdown_percentage::decimal, 2) AS cw_offer_percentage,
                bl.incremental_discount AS cw_incremental_discount,
                coalesce(
                    bl_c.effective_price_point,
                    round(((100 - bl.markdown_percentage) * bl.average_retail_price / 100)::numeric, 2)::float8
                ) AS cw_effective_price_point
            FROM bl_exploded bl
            LEFT JOIN bl_computed bl_c
                ON bl.product_level_id = bl_c.product_level_id
                AND bl.store_level_id = bl_c.store_level_id
                AND bl.pcd_id = bl_c.pcd_id
            WHERE bl.pcd_id = (SELECT pcd_id FROM current_pcd)
        ),

        future_pcd AS (
            SELECT pcd_id, order_number
            FROM pcd_info
            WHERE pcd_start_date > date(timezone(%3$L, now()))
            ORDER BY pcd_start_date
            LIMIT 1
        ),

        alerts_data AS (
            SELECT
                act.product_level_id, act.store_level_id,
                CASE
                    WHEN (abs(sum(act.sales_units) - sum(fin.sales_units)) * 100
                          / nullif((sum(act.sales_units) + sum(fin.sales_units)) / 2, 0)) > 10
                         AND min(ia_next.ia_markdown_percentage) != min(next_bl.markdown_percentage)
                         AND abs(sum(act.sales_units) - sum(fin.sales_units)) >= 1
                    THEN true
                    ELSE false
                END AS show_alert,
                sum(act.sales_units) - sum(fin.sales_units) AS sales_units_diff,
                min(ia_next.ia_markdown_percentage) AS ia_discount_next_pcd,
                (SELECT pcd_id FROM future_pcd) AS upcoming_pcd_id
            FROM price_markdown.tb_agg_actual act
            JOIN price_markdown.tb_agg_fin fin
                ON act.pcd_id = fin.pcd_id
                AND act.product_level_id = fin.product_level_id
                AND act.store_level_id = fin.store_level_id
                AND act.recommendation_date = fin.recommendation_date
            LEFT JOIN ia_exploded ia_next
                ON ia_next.pcd_id = (SELECT pcd_id FROM future_pcd)
                AND ia_next.product_level_id = act.product_level_id
                AND ia_next.store_level_id = act.store_level_id
            LEFT JOIN bl_exploded next_bl
                ON next_bl.pcd_id = (SELECT pcd_id FROM future_pcd)
                AND next_bl.product_level_id = act.product_level_id
                AND next_bl.store_level_id = act.store_level_id
            WHERE act.strategy_id = %1$s
                AND fin.strategy_id = %1$s
            GROUP BY act.product_level_id, act.store_level_id
        ),

        per_pcd_metrics AS (
            SELECT
                bl.product_level_id, bl.store_level_id,
                bl.order_number, bl.next_order_number, bl.prev_order_number,
                bl.is_locked,
                jsonb_build_object(
                    ''finalized_discount_percent'', bl.markdown_percentage,
                    ''finalized_pp'', coalesce(
                        round(bl_c.effective_price_point::numeric, 2),
                        round(((100 - bl.markdown_percentage) * bl.average_retail_price / 100)::numeric, 2)
                    ),
                    ''margin_finalized'', bl_c.margin,
                    ''revenue_finalized'', bl_c.revenue,
                    ''unit_finalized'', bl_c.sales_units,
                    ''incremental_discount'', bl.incremental_discount,
                    ''approval_status'', bl.approval_status,
                    ''is_locked'', bl.is_locked,
                    ''enable_lock'', CASE WHEN bl.markdown_percentage IS NULL THEN false ELSE true END,
                    ''finalized_is_locked'', false,
                    ''finalized_inventory'', bl_c.inventory,
                    ''finalized_markdown_dollar'', bl_c.markdown_dollar,
                    ''finalized_sell_through'', bl_c.sell_through,
                    ''next_pcd'', bl.next_order_number,
                    ''previous_pcd'', bl.prev_order_number
                ) AS bl_pcd_metric,
                jsonb_build_object(
                    ''ia_reco_discount_percent'', ia_e.ia_markdown_percentage,
                    ''ia_reco_pp'', coalesce(
                        round(ia_c.ia_effective_price_point::numeric, 2),
                        round(((100 - ia_e.ia_markdown_percentage) * bl.average_retail_price / 100)::numeric, 2)
                    ),
                    ''unit_ia_reco'', ia_c.ia_sales_units,
                    ''margin_ia_reco'', ia_c.ia_margin,
                    ''revenue_ia_reco'', ia_c.ia_revenue,
                    ''ia_incremental_discount'', ia_e.ia_incremental_discount,
                    ''ia_inventory'', ia_c.ia_inventory,
                    ''ia_markdown_dollar'', ia_c.ia_markdown_dollar,
                    ''ia_sell_through'', ia_c.ia_sell_through
                ) AS ia_pcd_metric
            FROM bl_exploded bl
            LEFT JOIN bl_computed bl_c
                ON bl.product_level_id = bl_c.product_level_id
                AND bl.store_level_id = bl_c.store_level_id
                AND bl.pcd_id = bl_c.pcd_id
            LEFT JOIN ia_computed ia_c
                ON bl.product_level_id = ia_c.product_level_id
                AND bl.store_level_id = ia_c.store_level_id
                AND bl.pcd_id = ia_c.pcd_id
            LEFT JOIN ia_exploded ia_e
                ON bl.product_level_id = ia_e.product_level_id
                AND bl.store_level_id = ia_e.store_level_id
                AND bl.order_number = ia_e.order_number
        )

        SELECT
            ppm.product_level_id::text || ''_'' || ppm.store_level_id::text AS rowid,
            0 AS order_,
            false AS is_footer_row,
            min(ppm.is_locked)::bool AS is_row_locked,
            ppm.product_level_id,
            prd.product_level_value,
            ppm.store_level_id,
            srd.store_level_value,
            cw.cw_offer_percentage,
            cw.cw_incremental_discount,
            cw.cw_effective_price_point,
            jsonb_object_agg(ppm.order_number::text, ppm.bl_pcd_metric) AS pcd_metrics,
            jsonb_object_agg(ppm.order_number::text, ppm.ia_pcd_metric) AS ia_pcd_metrics,
            pa.brand, pa.division, pa.department, pa.style, pa.color, pa.size, pa.product_name, pa.age,
            round(avg(
                (SELECT avg((v.value->>''average_retail_price'')::float8)
                 FROM jsonb_each(dl.pcd_data) v)
            )::decimal, 2)::float8 AS base_price,
            coalesce(al.show_alert, false) AS show_alert,
            al.sales_units_diff,
            al.ia_discount_next_pcd,
            al.upcoming_pcd_id
        FROM per_pcd_metrics ppm
        JOIN price_markdown.tb_strategy_discount_level_%1$s dl
            ON ppm.product_level_id = dl.product_level_id
            AND ppm.store_level_id = dl.store_level_id
        JOIN price_markdown.tb_strategy_product_reco_details prd
            ON ppm.product_level_id = prd.product_level_id
            AND prd.strategy_id = %1$s
        JOIN price_markdown.tb_strategy_store_reco_details srd
            ON ppm.store_level_id = srd.store_level_id
            AND srd.strategy_id = %1$s
        LEFT JOIN product_attrs pa
            ON ppm.product_level_id = pa.product_level_id
            AND ppm.store_level_id = pa.store_level_id
        LEFT JOIN current_week cw
            ON ppm.product_level_id = cw.product_level_id
            AND ppm.store_level_id = cw.store_level_id
        LEFT JOIN alerts_data al
            ON ppm.product_level_id = al.product_level_id
            AND ppm.store_level_id = al.store_level_id
        GROUP BY
            ppm.product_level_id, prd.product_level_value,
            ppm.store_level_id, srd.store_level_value,
            cw.cw_offer_percentage, cw.cw_incremental_discount, cw.cw_effective_price_point,
            pa.brand, pa.division, pa.department, pa.style, pa.color, pa.size, pa.product_name, pa.age,
            al.show_alert, al.sales_units_diff, al.ia_discount_next_pcd, al.upcoming_pcd_id,
            dl.pcd_data
    ', p_strategy_id, vl_end_rule, _client_timezone);

    raise notice 'Partial refresh query: %', vl_test_query;
    execute vl_test_query;

    -- Rebuild footer (overall metrics) using updated step4 table
    execute format('DROP TABLE IF EXISTS price_markdown_temp.tb_overall_metrics_cte_%1$s', p_strategy_id);

    vl_test_query := format('
        CREATE TABLE price_markdown_temp.tb_overall_metrics_cte_%1$s AS
        SELECT
            ''Sub total'' AS rowid,
            1 AS order_,
            true AS is_footer_row,
            false AS is_row_locked,
            null::int8 AS product_level_id,
            null::jsonb AS product_level_value,
            null::int8 AS store_level_id,
            null::jsonb AS store_level_value,
            null::float8 AS cw_offer_percentage,
            null::float8 AS cw_incremental_discount,
            null::float8 AS cw_effective_price_point,
            bl_agg.pcd_metrics,
            ia_agg.ia_pcd_metrics,
            null::text[] AS brand, null::text[] AS division, null::text[] AS department,
            null::text[] AS style, null::text[] AS color, null::text[] AS size,
            null::text[] AS product_name,
            null::float8 AS age, null::float8 AS base_price,
            null::bool AS show_alert, null::float8 AS sales_units_diff,
            null::float8 AS ia_discount_next_pcd, null::int AS upcoming_pcd_id
        FROM (
            SELECT jsonb_object_agg(key, agg_value) AS pcd_metrics
            FROM (
                SELECT
                    kv.key,
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
                FROM price_markdown_temp.tb_strategy_step4_full_%1$s sf
                CROSS JOIN LATERAL jsonb_each(sf.pcd_metrics) AS kv(key, value)
                GROUP BY kv.key
            ) per_pcd
        ) bl_agg,
        (
            SELECT jsonb_object_agg(key, agg_value) AS ia_pcd_metrics
            FROM (
                SELECT
                    kv.key,
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
                FROM price_markdown_temp.tb_strategy_step4_full_%1$s sf
                CROSS JOIN LATERAL jsonb_each(sf.ia_pcd_metrics) AS kv(key, value)
                GROUP BY kv.key
            ) per_pcd
        ) ia_agg
    ', p_strategy_id);

    raise notice 'Footer rebuild query: %', vl_test_query;
    execute vl_test_query;

    -- Rebuild future_week_data table
    execute format('DROP TABLE IF EXISTS price_markdown_temp.tb_future_week_data_%1$s', p_strategy_id);

    vl_test_query := format('
        CREATE TABLE price_markdown_temp.tb_future_week_data_%1$s AS
        SELECT
            dl.product_level_id,
            dl.store_level_id,
            min((pcd_entry.value->>''approval_status'')::text) AS min_approval_status,
            max((pcd_entry.value->>''approval_status'')::text) AS max_approval_status
        FROM price_markdown.tb_strategy_discount_level_%1$s dl
        CROSS JOIN LATERAL jsonb_each(dl.pcd_data) AS pcd_entry(key, value)
        JOIN price_markdown.tb_strategy_pcd_new tsp
            ON tsp.strategy_id = %1$s AND tsp.order_number = pcd_entry.key::int
        WHERE tsp.pcd_start_date > date(timezone(%2$L, now()))
        GROUP BY dl.product_level_id, dl.store_level_id
    ', p_strategy_id, _client_timezone);

    raise notice 'Future week query: %', vl_test_query;
    execute vl_test_query;

    update price_markdown.tb_strategy_master
    set final_data_prepared = true
    where strategy_id = p_strategy_id;

  end;
$function$
;
