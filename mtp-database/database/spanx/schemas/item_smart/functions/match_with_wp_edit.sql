--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:match_with runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for match_with_iaf_edit.sql
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_wp_edit(date, date, jsonb, text, _text, _text, text, text);

CREATE OR REPLACE FUNCTION item_smart.match_with_wp_edit(
    sdate date,
    edate date,
    filters jsonb,
    dept text,
    channels text[],
    subchannels text[],
    editable_kpi text,
    planing_level text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    updated_row_count INTEGER := 0;
    where_clause TEXT := '';
    wp_table_name TEXT;
    select_query TEXT;
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    update_query1 TEXT;
    update_query2 TEXT;
    is_special_order_condition TEXT := '';
    _st timestamptz;
    v_gen_random_uuid text := gen_random_uuid()::varchar;
BEGIN
    --------------------------------------------------------------------
    -- Cleanup temp table
    --------------------------------------------------------------------
    DROP TABLE IF EXISTS complete_data;

    wp_table_name := format('item_smart.wp_master_%I', dept);

    --------------------------------------------------------------------
    -- Editable KPI overrides channel logic
    --------------------------------------------------------------------
    IF editable_kpi IN ('committed_orders', 'cust_price') THEN
        channels := ARRAY['Wholesale'];
    END IF;

    --------------------------------------------------------------------
    -- Build WHERE clause from filters
    --------------------------------------------------------------------
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        operator := filter->>'operator';

        values := (
            SELECT string_agg(quote_literal(v), ', ')
            FROM jsonb_array_elements_text(filter->'value') v
        );

        IF planing_level = 'spo' AND attribute_name = 'l3_name' THEN
            IF values LIKE '%REGULAR_%' THEN
                is_special_order_condition := 'is_special_order = false';
                values := (
                    SELECT string_agg(
                        quote_literal(regexp_replace(v, '^REGULAR_', '')),
                        ', '
                    )
                    FROM jsonb_array_elements_text(filter->'value') v
                );
            ELSIF values LIKE '%SPO_%' THEN
                is_special_order_condition := 'is_special_order = true';
                values := (
                    SELECT string_agg(
                        quote_literal(regexp_replace(v, '^SPO_', '')),
                        ', '
                    )
                    FROM jsonb_array_elements_text(filter->'value') v
                );
            END IF;
        END IF;

        IF where_clause = '' THEN
            where_clause := format('%I %s (%s)', attribute_name, operator, values);
        ELSE
            where_clause := where_clause
                || format(' AND %I %s (%s)', attribute_name, operator, values);
        END IF;
    END LOOP;

    IF COALESCE(is_special_order_condition, '') <> '' THEN
        where_clause := where_clause || ' AND ' || is_special_order_condition;
    END IF;

    --------------------------------------------------------------------
    -- Build TEMP table
    --------------------------------------------------------------------
    select_query := format(
        '
        CREATE TEMP TABLE complete_data AS
        WITH hierarchy_data AS (
            SELECT DISTINCT
                fdm.fiscal_year_week,
                pa.hierarchy_code
            FROM item_smart.mv_product_hierarchies_filter pa
            CROSS JOIN "global".fiscal_date_mapping fdm
            WHERE %s
              AND "date" BETWEEN %L AND %L
        ),
        wp_data AS (
            SELECT
                id.hierarchy_code,
                id.current_week,
                id.channel,
                id.sub_channel,
                id.cust_price,
                id.committed_orders
            FROM %s id
            JOIN hierarchy_data hd
              ON hd.hierarchy_code = id.hierarchy_code
             AND hd.fiscal_year_week = id.current_week
            WHERE id.channel = ANY(%L)
            %s
        )
        SELECT * FROM wp_data;
        ',
        where_clause,
        sdate,
        edate,
        wp_table_name,
        channels,
        CASE
            WHEN array_length(subchannels, 1) > 0
            THEN format('AND id.sub_channel = ANY(%L)', subchannels)
            ELSE ''
        END
    );

    PERFORM global.sp_log(
        v_gen_random_uuid,
        'item_smart.match_with_wp_edit',
        'before executing select_query',
        select_query,
        jsonb_build_object(
            'sdate', sdate,
            'edate', edate,
            'filters', filters,
            'dept', dept,
            'channels', channels,
            'subchannels', subchannels,
            'editable_kpi', editable_kpi,
            'planing_level', planing_level
        )
    );

    EXECUTE select_query;

    --------------------------------------------------------------------
    -- Index temp table
    --------------------------------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_complete_data
        ON complete_data(hierarchy_code, current_week, channel, sub_channel);

    --------------------------------------------------------------------
    -- Update 1
    --------------------------------------------------------------------
    update_query1 := format(
        '
        UPDATE %s wp
        SET %s
        FROM complete_data cd
        WHERE wp.hierarchy_code = cd.hierarchy_code
          AND wp.current_week = cd.current_week
          AND wp.channel = cd.channel
          AND wp.sub_channel = cd.sub_channel
          AND wp.actualised = false
        ',
        wp_table_name,
        CASE
            WHEN editable_kpi = 'committed_orders'
                THEN 'written_sales_units = cd.committed_orders'
            WHEN editable_kpi = 'cust_price'
                THEN 'written_aur = cd.cust_price'
            ELSE 'NULL'
        END
    );

    EXECUTE update_query1;

    PERFORM global.sp_log(
        v_gen_random_uuid,
        'item_smart.match_with_wp_edit',
        'After executing update_query1',
        update_query1,
        jsonb_build_object(
            'sdate', sdate,
            'edate', edate,
            'filters', filters,
            'dept', dept,
            'channels', channels,
            'subchannels', subchannels,
            'editable_kpi', editable_kpi,
            'planing_level', planing_level
        )
    );

    --------------------------------------------------------------------
    -- Update 2
    --------------------------------------------------------------------
    update_query2 := format(
        '
        UPDATE %s wp
        SET %s,
            updated_at = now()
        FROM complete_data cd
        WHERE wp.hierarchy_code = cd.hierarchy_code
          AND wp.current_week = cd.current_week
          AND wp.channel = cd.channel
          AND wp.sub_channel = cd.sub_channel
          AND wp.actualised = false
        ',
        wp_table_name,
        CASE
            WHEN editable_kpi = 'committed_orders' THEN
            '
            written_sales_dollars = wp.written_sales_units * wp.written_aur,
            written_sales_cost    = wp.written_sales_units * wp.written_auc,
            written_gm_dollar     = (wp.written_sales_units * wp.written_aur)
                                    - (wp.written_sales_units * wp.written_auc),
            written_gm_perc       = ((wp.written_sales_units * wp.written_aur)
                                    - (wp.written_sales_units * wp.written_auc))
                                    / NULLIF((wp.written_sales_units * wp.written_aur), 0),
            return_units          = wp.return_perc * wp.written_sales_units,
            return_dollars        = (wp.return_perc * wp.written_sales_units) * wp.written_aur,
            net_sales_units       = wp.written_sales_units
                                    - (wp.return_perc * wp.written_sales_units),
            net_sales_dollars     = (wp.written_sales_units * wp.written_aur)
                                    - ((wp.return_perc * wp.written_sales_units) * wp.written_aur)
            '
            WHEN editable_kpi = 'cust_price' THEN
            '
            written_sales_dollars = wp.written_sales_units * wp.written_aur,
            written_dr_perc       = (wp.written_air - wp.written_aur)
                                    / NULLIF(wp.written_air, 0),
            written_gm_dollar     = (wp.written_sales_units * wp.written_aur)
                                    - wp.written_sales_cost,
            written_gm_perc       = ((wp.written_sales_units * wp.written_aur)
                                    - wp.written_sales_cost)
                                    / NULLIF((wp.written_sales_units * wp.written_aur), 0),
            return_dollars        = wp.return_units * wp.written_aur,
            net_sales_dollars     = (wp.written_sales_units * wp.written_aur)
                                    - (wp.return_units * wp.written_aur)
            '
            ELSE 'NULL'
        END
    );

    EXECUTE update_query2;

    PERFORM global.sp_log(
        v_gen_random_uuid,
        'item_smart.match_with_wp_edit',
        'After executing update_query2',
        update_query2,
        jsonb_build_object(
            'sdate', sdate,
            'edate', edate,
            'filters', filters,
            'dept', dept,
            'channels', channels,
            'subchannels', subchannels,
            'editable_kpi', editable_kpi,
            'planing_level', planing_level
        )
    );

    --------------------------------------------------------------------
    -- Final
    --------------------------------------------------------------------
    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
    RETURN updated_row_count;
END;
$function$;
