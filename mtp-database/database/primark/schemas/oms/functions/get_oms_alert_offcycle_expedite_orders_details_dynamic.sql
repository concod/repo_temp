--liquibase formatted sql
--changeset chandranil.ghosh:primark_offcycle_sp_rewrite_expedite_body_2 runOnChange:true stripComments:false splitStatements:false context:MTP-130429 labels:MTP-130429
--comment: MTP-130429 Rewrite off-cycle dynamic SP with expedite orders SQL body and full SP parameterisation
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_alert_offcycle_expedite_orders_details_dynamic(refcursor, jsonb, date, date, jsonb);

CREATE OR REPLACE FUNCTION oms.get_oms_alert_offcycle_expedite_orders_details_dynamic(
    input_refcursor         refcursor,
    product_attribute_query jsonb,
    table_query             jsonb    DEFAULT '{}'::jsonb,
    show_non_reviewed       boolean  DEFAULT false,
    sp_config               jsonb    DEFAULT NULL::jsonb
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
/*
  Fully Config-Driven Expedite Alert Details (Off-Cycle path)

  Follows the same pattern as get_oms_constraints_lead_time_dynamic et al.:
    - select_columns           → drives the entire final SELECT list
    - select_group_by          → drives GROUP BY positions
    - cte_columns              → drives paf_kpi_oor CTE SELECT list
    - additional_join          → JOINs inside paf_kpi_oor CTE (e.g. oms_kpi, distribution_centres)
    - outer_additional_joins   → JOINs in the final SELECT (e.g. oms_pack_config)
    - paf_columns / paf_group_by / paf_join_condition / paf_filter → PAF subquery
    - additional_filters / query_replacements → extension points

  The CTE pipeline (min_rop_base → min_rop_helper → recommended_min_rop →
  paf_kpi_oor → alerts_expedite → distinct_po_counts) is the fixed business logic,
  equivalent to the main table in constraints SPs.

  Placeholder __SIZE_SORT__ in select_columns is replaced at runtime with the
  computed ARRAY_AGG ORDER BY clause (default: ORDER BY size_order ASC NULLS LAST).
*/
DECLARE
    -- Config-driven (same keys consumed by every mature dynamic SP)
    v_select_columns         TEXT;
    v_select_group_by        TEXT;
    v_paf_columns            TEXT;
    v_paf_group_by           TEXT;
    v_additional_joins       TEXT := '';
    v_additional_filters     TEXT := '';
    v_paf_join_condition     TEXT;
    v_paf_filter             TEXT;
    v_query_replacements     JSONB;
    v_cte_columns            TEXT;
    v_outer_additional_joins TEXT := '';

    -- Table-query parsing (same as static get_oms_alert_expedite_orders_details)
    v_limit_cls          TEXT  := '';
    v_search_cls         TEXT  := '';
    v_sort_cls           TEXT  := '';
    v_size_search_cls    TEXT  := '';
    v_size_sort_cls      TEXT  := '';
    limit_json           JSONB := '{}';
    search_json          JSONB := '{}';
    sort_json            JSONB := '{}';
    new_sort_array       JSONB := '[]'::jsonb;
    size_sort_array      JSONB := '[]'::jsonb;
    new_search_array     JSONB := '[]'::jsonb;
    sort_array           JSONB := '[]'::jsonb;
    size_search_array    JSONB := '[]'::jsonb;
    search_array         JSONB := '[]'::jsonb;
    sort_item            JSONB := '{}';
    search_item          JSONB := '{}';
    size_sort            JSONB := '{}';
    size_search          JSONB := '{}';
    i                    INT;

    -- General
    _query_pa            TEXT  := '';
    _key                 TEXT;
    v_offcycle_sql       TEXT  := '';
    v_gen_random_uuid    TEXT  := gen_random_uuid()::varchar;
    v_error_message      TEXT;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- ============================================================
    -- 1. Extract configuration (identical to constraints SPs)
    -- ============================================================
    v_select_columns     := sp_config->>'select_columns';
    v_select_group_by    := COALESCE(sp_config->>'select_group_by', '');
    v_paf_columns        := sp_config->>'paf_columns';
    v_paf_group_by       := sp_config->>'paf_group_by';
    v_additional_joins   := COALESCE(sp_config->>'additional_join', '');
    v_additional_filters := COALESCE(sp_config->>'additional_filter',
                                     sp_config->>'additional_filters', '');
    v_query_replacements := COALESCE(sp_config->'query_replacements',
                                     sp_config->'query_replacement');
    v_paf_join_condition     := COALESCE(sp_config->>'paf_join_condition',
                                        'oor.product_code = paf.product_code');
    v_paf_filter             := COALESCE(sp_config->>'paf_filter', '');
    v_cte_columns            := COALESCE(sp_config->>'cte_columns', 'oor.*');
    v_outer_additional_joins := COALESCE(sp_config->>'outer_additional_joins', '');

    -- Validate required fields (same contract as constraints SPs)
    IF v_select_columns IS NULL OR TRIM(v_select_columns) = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    IF v_paf_columns IS NULL OR TRIM(v_paf_columns) = '' THEN
        RAISE WARNING 'No PAF columns configured, using product_code as default';
        v_paf_columns  := 'product_code';
        v_paf_group_by := '1';
    ELSIF v_paf_group_by IS NULL OR TRIM(v_paf_group_by) = '' THEN
        RAISE EXCEPTION 'paf_group_by is required when paf_columns is provided';
    END IF;

    RAISE NOTICE 'offcycle dynamic SP: select_columns=% chars, paf_columns=% chars',
        LENGTH(v_select_columns), LENGTH(v_paf_columns);

    -- ============================================================
    -- 2. Build product-attribute filter (same as all dynamic SPs)
    -- ============================================================
    _query_pa := oms.form_main_table_filters('ph_master', product_attribute_query);

    IF v_query_replacements IS NOT NULL
       AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements) LOOP
            IF position(_key in _query_pa) > 0 THEN
                _query_pa := regexp_replace(
                    _query_pa, '\y' || _key || '\y',
                    v_query_replacements->>_key, 'g'
                );
            END IF;
        END LOOP;
    END IF;

    -- ============================================================
    -- 3. Parse table_query for pagination / sort / search
    --    (same logic as static get_oms_alert_expedite_orders_details)
    -- ============================================================
    search_json := COALESCE(table_query, '{}');

    IF search_json <> '{}' AND search_json -> 'limit' IS NOT NULL THEN
        limit_json  := search_json -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
    END IF;

    IF search_json <> '{}' AND search_json -> 'sort' IS NOT NULL THEN
        sort_array := search_json -> 'sort';
        FOR i IN 0 .. jsonb_array_length(sort_array) - 1 LOOP
            sort_item := sort_array -> i;
            IF sort_item ->> 'column' = 'size' THEN
                sort_item       := jsonb_set(sort_item, '{column}', '"size_order"');
                size_sort_array := size_sort_array || sort_item;
            ELSE
                new_sort_array  := new_sort_array || sort_item;
            END IF;
        END LOOP;
        sort_json   := jsonb_set(sort_json, '{sort}', new_sort_array);
        IF jsonb_array_length(size_sort_array) > 0 THEN
            size_sort := jsonb_build_object('sort', size_sort_array);
        END IF;
        search_json := search_json - 'sort';
    END IF;

    IF search_json <> '{}' AND search_json -> 'search' IS NOT NULL THEN
        search_array := search_json -> 'search';
        FOR i IN 0 .. jsonb_array_length(search_array) - 1 LOOP
            search_item := search_array -> i;
            IF search_item ->> 'column' = 'size' THEN
                size_search_array := size_search_array || search_item;
            ELSE
                new_search_array  := new_search_array || search_item;
            END IF;
        END LOOP;
        search_json := jsonb_set(search_json, '{search}', new_search_array);
        IF jsonb_array_length(size_search_array) > 0 THEN
            size_search := jsonb_build_object('search', size_search_array);
        END IF;
    END IF;

    IF size_search IS NOT NULL AND size_search <> '{}' THEN
        v_size_search_cls := global.form_table_query(size_search);
    END IF;

    IF size_sort IS NOT NULL AND size_sort <> '{}' THEN
        v_size_sort_cls := global.form_table_query(size_sort);
    ELSE
        v_size_sort_cls := 'ORDER BY size_order ASC NULLS LAST';
    END IF;

    IF search_json <> '{}' THEN v_search_cls := global.form_table_query(search_json); END IF;
    IF sort_json   <> '{}' THEN v_sort_cls   := global.form_table_query(sort_json);   END IF;

    -- ============================================================
    -- 4. Cleanup and placeholder replacement
    -- ============================================================
    v_select_columns     := REPLACE(v_select_columns, E'\\n', ' ');
    v_paf_columns        := REPLACE(v_paf_columns,    E'\\n', ' ');
    v_cte_columns        := REPLACE(v_cte_columns,    E'\\n', ' ');
    v_select_columns     := regexp_replace(v_select_columns,     E'\\\\+''', '''', 'g');
    v_additional_filters := regexp_replace(v_additional_filters, E'\\\\+''', '''', 'g');
    v_paf_filter         := regexp_replace(v_paf_filter,         E'\\\\+''', '''', 'g');

    -- Replace __SIZE_SORT__ placeholder in select_columns with computed clause
    v_select_columns := REPLACE(v_select_columns, '__SIZE_SORT__', v_size_sort_cls);

    -- ============================================================
    -- 5. Build dynamic SQL
    --    Fixed CTE pipeline (business logic) + config-driven final SELECT
    -- ============================================================
    v_offcycle_sql := '
        WITH min_rop_base AS MATERIALIZED (
            SELECT
                article, loc_code,
                MIN(rop) AS min_rop,
                MIN(expected_receipt_date)
                    FILTER (WHERE order_type = ''Immediate'') AS earliest_receipt_date,
                MIN(expected_receipt_date)
                    FILTER (WHERE order_type = ''Order Cycle'') AS order_cycle_receipt_date
            FROM oms.oms_orders_recommended
            WHERE order_gen_type != ''Manual''
              AND order_status_id != 3
              AND order_type = ''Immediate''
            GROUP BY article, loc_code
        )

        ,min_rop_helper AS MATERIALIZED (
            SELECT
                oor.article, oor.loc_code, oor.size, oor.product_code,
                oor.rop, oor.order_status_id, oor.created_at,
                oor.inventory_deficit_agg, oor.lost_sales_agg, oor.unit_cost,
                oor.ia_shipment_order_quantity, oor.roq_unconstrained,
                oor.order_quantity, oor.order_quantity_eaches, oor.pack_id,
                oor.order_placement_date,
                oor.order_quantity * oor.unit_cost AS order_cost,
                oor.raw_roq, oor.roq_constrained,
                oor.order_placement_recom_date, oor.recom_receipt_date,
                oor.expected_receipt_date, oor.order_type,
                oor.elt_projected_safety_stock, oor.elt_projected_bop,
                GREATEST(oor.elt_projected_safety_stock - oor.elt_projected_bop, 0)
                    AS safety_stock_deficit,
                oor.lost_sales_agg * oor.unit_cost AS lost_sales_agg_cost,
                ast."order" AS size_order,
                mr.min_rop, mr.earliest_receipt_date, mr.order_cycle_receipt_date
            FROM oms.oms_orders_recommended oor
            JOIN min_rop_base mr
                ON mr.article = oor.article AND mr.loc_code = oor.loc_code
            LEFT JOIN oms.article_status_tag ast
                ON oor.product_code = ast.product_code AND oor.size = ast.size
            WHERE oor.order_gen_type != ''Manual''
              AND oor.order_status_id != 3
              AND oor.rop = mr.min_rop
        )

        ,recommended_min_rop AS MATERIALIZED (
            SELECT * FROM min_rop_helper ' || v_size_search_cls || '
        )

        ,paf_kpi_oor AS MATERIALIZED (
            SELECT ' || v_cte_columns || '
            FROM recommended_min_rop oor
            INNER JOIN (
                SELECT ' || v_paf_columns || '
                FROM global.product_attributes_filter
                ' || _query_pa || '
                ' || CASE WHEN v_paf_filter != '' THEN v_paf_filter ELSE '' END || '
                GROUP BY ' || v_paf_group_by || '
            ) paf ON ' || v_paf_join_condition || '
            ' || CASE WHEN v_additional_joins != '' THEN v_additional_joins ELSE '' END || '
        )

        ,alerts_expedite AS MATERIALIZED (
            SELECT DISTINCT loc_code, product_code
            FROM oms.oms_alerts
            WHERE expedite_order = TRUE
            ' || CASE WHEN show_non_reviewed
                      THEN ' AND NOT is_expedite_order_resolved = TRUE'
                      ELSE '' END || '
        )

        ,distinct_po_counts AS MATERIALIZED (
            SELECT po.loc_code, po.product_code,
                   SUM(po.oo) + SUM(po.it) AS commited_receipt_units,
                   COUNT(DISTINCT po.po_id) AS distinct_po_count
            FROM oms.oms_po_master po
            INNER JOIN alerts_expedite ae
                ON ae.loc_code = po.loc_code AND ae.product_code = po.product_code
            INNER JOIN recommended_min_rop mrh
                ON po.loc_code = mrh.loc_code AND po.product_code = mrh.product_code
            WHERE po.projected_delivery_date > CURRENT_DATE + INTERVAL ''14 days''
              AND po.projected_delivery_date
                  BETWEEN (COALESCE(mrh.recom_receipt_date, NOW()) - INTERVAL ''12 weeks'')
                      AND COALESCE(mrh.earliest_receipt_date, mrh.order_cycle_receipt_date)
            GROUP BY po.loc_code, po.product_code
        )

        SELECT * FROM (
            SELECT ' || v_select_columns || '
            FROM oms.oms_alerts alerts
            INNER JOIN paf_kpi_oor pko
                ON alerts.article = pko.article
               AND alerts.loc_code = pko.loc_code
               AND pko.product_code = alerts.product_code
            LEFT JOIN distinct_po_counts po
                ON pko.product_code = po.product_code
               AND pko.loc_code = po.loc_code
            ' || CASE WHEN v_outer_additional_joins != '' THEN v_outer_additional_joins ELSE '' END || '
            WHERE alerts.expedite_order
            ' || CASE WHEN show_non_reviewed
                      THEN ' AND NOT alerts.is_expedite_order_resolved = TRUE'
                      ELSE '' END || '
            ' || CASE WHEN v_additional_filters != ''
                      THEN v_additional_filters ELSE '' END || '
            ' || CASE WHEN v_select_group_by != ''
                      THEN 'GROUP BY ' || v_select_group_by ELSE '' END || '
        ) X
        ' || v_search_cls || '
        ' || v_sort_cls || '
        ' || v_limit_cls;

    RAISE NOTICE 'offcycle dynamic SQL (config-driven): %', v_offcycle_sql;

    BEGIN
        OPEN input_refcursor FOR EXECUTE v_offcycle_sql;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error executing offcycle dynamic SQL: % (SQLSTATE: %)',
                SQLERRM, SQLSTATE;
    END;

    PERFORM global.sp_log(
        v_gen_random_uuid,
        'oms.get_oms_alert_offcycle_expedite_orders_details_dynamic',
        'Execution completed',
        v_offcycle_sql,
        jsonb_build_object(
            'product_attribute_query', product_attribute_query,
            'table_query', table_query,
            'show_non_reviewed', show_non_reviewed,
            'config_provided', sp_config IS NOT NULL
        )
    );

    RETURN input_refcursor;

EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;
    PERFORM global.sp_log(
        v_gen_random_uuid,
        'oms.get_oms_alert_offcycle_expedite_orders_details_dynamic',
        'ERROR',
        v_error_message,
        jsonb_build_object(
            'product_attribute_query', product_attribute_query,
            'table_query', table_query,
            'sqlstate', SQLSTATE
        )
    );
    RAISE EXCEPTION 'Dynamic offcycle SP failed: % (SQLSTATE: %)',
        v_error_message, SQLSTATE;
END;
$function$;