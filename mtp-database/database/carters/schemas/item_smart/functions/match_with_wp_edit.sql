--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:match_with runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for match_with_iaf_edit.sql
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_wp_edit(date, date, jsonb, text, text[], text, text);

CREATE OR REPLACE FUNCTION item_smart.match_with_wp_edit(
    sdate date,
    edate date,
    filters jsonb,
    dept text,
    channels text[],
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
    _st timestamptz;
    v_gen_random_uuid text := gen_random_uuid()::varchar;
BEGIN
    ------------------------------------------------------------------
    -- Cleanup
    ------------------------------------------------------------------
    DROP TABLE IF EXISTS complete_data;

    wp_table_name := format('item_smart.wp_master_%I', dept);

    ------------------------------------------------------------------
    -- Build WHERE clause
    ------------------------------------------------------------------
    FOR filter IN SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        operator := filter->>'operator';

        values := (
            SELECT string_agg(quote_literal(v), ', ')
            FROM jsonb_array_elements_text(filter->'value') v
        );

        IF where_clause = '' THEN
            where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
        ELSE
            where_clause := where_clause || ' AND ' ||
                            attribute_name || ' ' || operator || ' (' || values || ')';
        END IF;
    END LOOP;

    ------------------------------------------------------------------
    -- Build SELECT query (FIX: build before sp_log)
    ------------------------------------------------------------------
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
              AND fdm.calendar_date BETWEEN %L AND %L
        ),
        wp_data AS (
            SELECT
                id.hierarchy_code,
                id.current_week,
                id.channel,
                id.on_order_placed_total_unit,
                id.ia_vendor_adj_roq
            FROM %s id
            JOIN hierarchy_data hd
              ON hd.hierarchy_code = id.hierarchy_code
             AND hd.fiscal_year_week = id.current_week
            WHERE id.channel = ANY(%L)
        )
        SELECT * FROM wp_data;
        ',
        where_clause,
        sdate,
        edate,
        wp_table_name,
        channels
    );

    ------------------------------------------------------------------
    -- sp_log (same as original, correct position)
    ------------------------------------------------------------------
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
            'editable_kpi', editable_kpi,
            'planing_level', planing_level
        )
    );

    ------------------------------------------------------------------
    -- Execute SELECT
    ------------------------------------------------------------------
    EXECUTE select_query;

    CREATE INDEX idx_complete_data
        ON complete_data(hierarchy_code, current_week, channel);

    ------------------------------------------------------------------
    -- UPDATE 1
    ------------------------------------------------------------------
    update_query1 := format(
        '
        UPDATE %s wp
           SET %s
        FROM complete_data cd
        WHERE wp.hierarchy_code = cd.hierarchy_code
          AND wp.current_week = cd.current_week
          AND wp.channel = cd.channel
        ',
        wp_table_name,
        CASE
            WHEN editable_kpi = 'on_order_placed_total_unit'
                THEN 'total_receipt_units = cd.on_order_placed_total_unit'
            WHEN editable_kpi = 'ia_vendor_adj_roq'
                THEN 'total_receipt_units = cd.ia_vendor_adj_roq'
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
            'editable_kpi', editable_kpi,
            'planing_level', planing_level
        )
    );

    ------------------------------------------------------------------
    -- UPDATE 2
    ------------------------------------------------------------------
    update_query2 := format(
        '
        UPDATE %s wp
           SET %s
        FROM complete_data cd
        WHERE wp.hierarchy_code = cd.hierarchy_code
          AND wp.current_week = cd.current_week
          AND wp.channel = cd.channel
        ',
        wp_table_name,
        CASE
            WHEN editable_kpi IN ('on_order_placed_total_unit', 'ia_vendor_adj_roq')
            THEN '
                total_receipt_cost = COALESCE(wp.total_receipt_units, 0) * COALESCE(wp.total_receipt_auc, 0),
                total_receipt_msrp = COALESCE(wp.total_receipt_units, 0) * COALESCE(wp.total_receipt_msrp_per_unit, 0),
                on_order_unplaced_total_unit = COALESCE(wp.total_receipt_units, 0)
                                                - COALESCE(wp.on_order_placed_total_unit, 0),
                on_order_unplaced_total = (COALESCE(wp.total_receipt_units, 0) * COALESCE(wp.total_receipt_auc, 0))
                                            - COALESCE(wp.on_order_placed_total, 0),
                on_order_unplaced_total_auc =
                    ((COALESCE(wp.total_receipt_units, 0) * COALESCE(wp.total_receipt_auc, 0))
                      - COALESCE(wp.on_order_placed_total, 0))
                    / NULLIF(
                        COALESCE(wp.total_receipt_units, 0)
                        - COALESCE(wp.on_order_placed_total_unit, 0),
                        0
                    )
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
            'editable_kpi', editable_kpi,
            'planing_level', planing_level
        )
    );

    ------------------------------------------------------------------
    -- Final row count
    ------------------------------------------------------------------
    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
    RETURN updated_row_count;
END;
$function$;
