--liquibase formatted sql
--changeset oms:get_oms_alert_pending_orders_details_dynamic_v1 runOnChange:true stripComments:false splitStatements:false
--comment: SP parameterisation for pending orders alert details (refcursor + sp_config). Parity with static Primark: article_loc_code_distinct, min_rop by style/loc, PAF SELECT *, pending_order filter, __SIZE_SORT__.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_alert_pending_orders_details_dynamic(input refcursor, jsonb, jsonb, boolean, jsonb);

CREATE OR REPLACE FUNCTION oms.get_oms_alert_pending_orders_details_dynamic(
    input                     refcursor,
    product_attribute_query   jsonb,
    table_query               jsonb,
    filter_reviewed_orders    boolean,
    sp_config                 jsonb DEFAULT NULL::jsonb
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    v_select_columns         TEXT := '';
    v_select_group_by        TEXT := '';
    v_paf_columns            TEXT := '';
    v_paf_group_by           TEXT := '';
    v_paf_inner_sql          TEXT := '';
    v_additional_join        TEXT := '';
    v_additional_filters     TEXT := '';
    v_query_replacements     JSONB;
    v_paf_join_condition     TEXT := '';
    v_paf_filter             TEXT := '';
    v_cte_columns            TEXT := '';
    v_outer_additional_joins TEXT := '';
    v_min_rop_select         TEXT := '';
    v_min_rop_joins          TEXT := '';
    v_min_rop_where          TEXT := '';
    v_alerts_pko_join        TEXT := '';
    v_alert_base_where       TEXT := '';
    v_paf_select_star        BOOLEAN := FALSE;

    v_limit_cls              TEXT := '';
    v_search_cls             TEXT := '';
    v_sort_cls               TEXT := '';
    v_size_search_cls        TEXT := '';
    v_size_sort_cls          TEXT := '';
    limit_json               JSONB := '{}'::jsonb;
    search_json              JSONB := '{}'::jsonb;
    sort_json                JSONB := '{}'::jsonb;
    new_sort_array           JSONB := '[]'::jsonb;
    size_sort_array          JSONB := '[]'::jsonb;
    new_search_array         JSONB := '[]'::jsonb;
    sort_array               JSONB := '[]'::jsonb;
    size_search_array        JSONB := '[]'::jsonb;
    search_array             JSONB := '[]'::jsonb;
    sort_item                JSONB := '{}'::jsonb;
    search_item              JSONB := '{}'::jsonb;
    size_sort                JSONB := '{}'::jsonb;
    size_search              JSONB := '{}'::jsonb;
    i                        INT;

    v_sql                    TEXT := '';
    _query_pa                TEXT := '';
    _key                     TEXT := '';
    v_gen_random_uuid        TEXT := gen_random_uuid()::varchar;
    v_modified_product_filter JSONB;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    v_select_columns := sp_config->>'select_columns';
    v_select_group_by := COALESCE(sp_config->>'select_group_by', '');
    v_paf_columns := COALESCE(sp_config->>'paf_columns', '');
    v_paf_group_by := sp_config->>'paf_group_by';
    v_additional_join := COALESCE(
        sp_config->>'additional_join',
        sp_config->>'additional_joins',
        ''
    );
    v_additional_filters := COALESCE(
        sp_config->>'additional_filters',
        sp_config->>'additional_filter',
        ''
    );
    v_query_replacements := COALESCE(
        sp_config->'query_replacements',
        sp_config->'query_replacement'
    );
    v_paf_join_condition := COALESCE(
        sp_config->>'paf_join_condition',
        'oor.product_code = paf.product_code'
    );
    v_paf_filter := COALESCE(sp_config->>'paf_filter', '');
    v_cte_columns := COALESCE(
        sp_config->>'cte_columns',
        'paf.article,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.l5_name,
                paf.product_description,
                paf.primary_vendor_id AS vendor_code,
                paf.primary_vendor_name AS vendor_name,
                ok.store_inv,
                ok.dc_inv,
                ok.system_inv,
                ok.safety_stock,
                ok.open_receipt_units,
                oor.*'
    );
    v_outer_additional_joins := COALESCE(sp_config->>'outer_additional_joins', '');
    v_alerts_pko_join := COALESCE(
        sp_config->>'alerts_pko_join',
        'alerts.loc_code = pko.loc_code AND pko.product_code = alerts.product_code'
    );
    v_alert_base_where := COALESCE(
        sp_config->>'alert_base_where',
        'alerts.pending_order'
    );

    BEGIN
        v_paf_select_star := COALESCE((sp_config->>'paf_select_star')::boolean, FALSE);
    EXCEPTION
        WHEN OTHERS THEN
            v_paf_select_star := FALSE;
    END;

    IF v_select_columns IS NULL OR TRIM(v_select_columns) = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    IF NOT v_paf_select_star THEN
        IF v_paf_columns IS NULL OR TRIM(v_paf_columns) = '' THEN
            RAISE WARNING 'No PAF columns configured, using product_code as default';
            v_paf_columns := 'product_code';
            v_paf_group_by := '1';
        ELSIF v_paf_group_by IS NULL THEN
            v_paf_group_by := '';
        END IF;
    END IF;

    IF v_select_group_by IS NULL OR TRIM(v_select_group_by) = '' THEN
        RAISE EXCEPTION 'select_group_by is required in sp_config (GROUP BY positions from oms_sp_config_columns is_group_by)';
    END IF;

    v_modified_product_filter := product_attribute_query;
    IF (sp_config->'product_filter_additions') IS NOT NULL
       AND jsonb_typeof(sp_config->'product_filter_additions') = 'object' THEN
        v_modified_product_filter := v_modified_product_filter || (sp_config->'product_filter_additions');
    END IF;

    _query_pa := oms.form_main_table_filters('ph_master', v_modified_product_filter);

    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements) LOOP
            _query_pa := REPLACE(_query_pa, _key, v_query_replacements->>_key);
        END LOOP;
    END IF;

    search_json := COALESCE(table_query, '{}'::jsonb);

    IF search_json <> '{}'::jsonb AND search_json -> 'limit' IS NOT NULL THEN
        limit_json := search_json -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
    END IF;

    IF search_json <> '{}'::jsonb AND search_json -> 'sort' IS NOT NULL THEN
        sort_array := search_json -> 'sort';
        FOR i IN 0 .. jsonb_array_length(sort_array) - 1 LOOP
            sort_item := sort_array -> i;
            IF sort_item ->> 'column' = 'size' THEN
                sort_item := jsonb_set(sort_item, '{column}', '"size_order"');
                size_sort_array := size_sort_array || sort_item;
            ELSE
                new_sort_array := new_sort_array || sort_item;
            END IF;
        END LOOP;
        sort_json := jsonb_set(sort_json, '{sort}', new_sort_array);
        IF jsonb_array_length(size_sort_array) > 0 THEN
            size_sort := jsonb_build_object('sort', size_sort_array);
        END IF;
        search_json := search_json - 'sort';
    END IF;

    IF search_json <> '{}'::jsonb AND search_json -> 'search' IS NOT NULL THEN
        search_array := search_json -> 'search';
        FOR i IN 0 .. jsonb_array_length(search_array) - 1 LOOP
            search_item := search_array -> i;
            IF search_item ->> 'column' = 'size' THEN
                size_search_array := size_search_array || search_item;
            ELSE
                new_search_array := new_search_array || search_item;
            END IF;
        END LOOP;
        search_json := jsonb_set(search_json, '{search}', new_search_array);
        IF jsonb_array_length(size_search_array) > 0 THEN
            size_search := jsonb_build_object('search', size_search_array);
        END IF;
    END IF;

    IF size_search IS NOT NULL AND size_search <> '{}'::jsonb THEN
        v_size_search_cls := global.form_table_query(size_search);
    END IF;

    IF size_sort IS NOT NULL AND size_sort <> '{}'::jsonb THEN
        v_size_sort_cls := global.form_table_query(size_sort);
    ELSE
        v_size_sort_cls := ' ORDER BY size_order ASC NULLS LAST';
    END IF;

    IF search_json <> '{}'::jsonb THEN
        v_search_cls := global.form_table_query(search_json);
    END IF;

    IF sort_json <> '{}'::jsonb THEN
        v_sort_cls := global.form_table_query(sort_json);
    END IF;

    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements) LOOP
            v_limit_cls := REPLACE(v_limit_cls, _key, v_query_replacements->>_key);
            v_search_cls := REPLACE(v_search_cls, _key, v_query_replacements->>_key);
            v_sort_cls := REPLACE(v_sort_cls, _key, v_query_replacements->>_key);
            v_size_search_cls := REPLACE(v_size_search_cls, _key, v_query_replacements->>_key);
            v_size_sort_cls := REPLACE(v_size_sort_cls, _key, v_query_replacements->>_key);
        END LOOP;
    END IF;

    v_select_columns := REPLACE(v_select_columns, E'\\n', ' ');
    v_paf_columns := REPLACE(v_paf_columns, E'\\n', ' ');
    v_cte_columns := REPLACE(v_cte_columns, E'\\n', ' ');
    v_select_columns := regexp_replace(v_select_columns, E'\\\\+''', '''', 'g');
    v_additional_filters := regexp_replace(v_additional_filters, E'\\\\+''', '''', 'g');
    v_paf_filter := regexp_replace(v_paf_filter, E'\\\\+''', '''', 'g');

    v_select_columns := REPLACE(
        v_select_columns,
        '__SIZE_SORT__',
        CASE
            WHEN NULLIF(BTRIM(v_size_sort_cls), '') IS NULL THEN ''
            ELSE ' ' || BTRIM(v_size_sort_cls)
        END
    );

    v_min_rop_select := NULLIF(TRIM(sp_config->>'min_rop_select_columns'), '');
    v_min_rop_joins := NULLIF(TRIM(sp_config->>'min_rop_joins'), '');
    v_min_rop_where := NULLIF(TRIM(sp_config->>'min_rop_where_clause'), '');

    IF v_min_rop_select IS NULL OR v_min_rop_joins IS NULL OR v_min_rop_where IS NULL THEN
        RAISE EXCEPTION 'min_rop_select_columns, min_rop_joins, and min_rop_where_clause are required in sp_config';
    END IF;

    v_min_rop_select := REPLACE(v_min_rop_select, E'\\n', ' ');
    v_min_rop_joins := REPLACE(v_min_rop_joins, E'\\n', ' ');
    v_min_rop_where := REPLACE(v_min_rop_where, E'\\n', ' ');
    v_min_rop_select := regexp_replace(v_min_rop_select, E'\\\\+''', '''', 'g');
    v_min_rop_joins := regexp_replace(v_min_rop_joins, E'\\\\+''', '''', 'g');
    v_min_rop_where := regexp_replace(v_min_rop_where, E'\\\\+''', '''', 'g');

    IF v_paf_select_star THEN
        v_paf_inner_sql := '(
                SELECT * FROM global.product_attributes_filter
                ' || _query_pa || '
                ' || CASE WHEN v_paf_filter <> '' THEN v_paf_filter ELSE '' END || '
            )';
    ELSE
        v_paf_inner_sql := '(
                SELECT ' || v_paf_columns || '
                FROM global.product_attributes_filter
                ' || _query_pa || '
                ' || CASE WHEN v_paf_filter <> '' THEN v_paf_filter ELSE '' END || '
                ' || CASE
                       WHEN NULLIF(TRIM(v_paf_group_by), '') IS NOT NULL
                       THEN 'GROUP BY ' || v_paf_group_by
                       ELSE ''
                   END || '
            )';
    END IF;

    v_sql := '
    WITH article_loc_code_distinct AS (
        SELECT DISTINCT ON (article, loc_code)
            article,
            loc_code,
            lead_time,
            mode_shipment
        FROM oms.oms_constraints_lead_time
    ),
    min_rop_helper AS (
        SELECT
            ' || v_min_rop_select || '
        FROM oms.oms_orders_recommended oor
        ' || v_min_rop_joins || '
        WHERE ' || v_min_rop_where || '
    ),
    recommended_min_rop AS (
        SELECT * FROM min_rop_helper WHERE rop = min_rop
    ),
    sorted_data AS (
        SELECT * FROM recommended_min_rop
        ' || v_size_search_cls || '
        ' || v_size_sort_cls || '
    ),
    distinct_po_counts AS (
        SELECT
            po.loc_code,
            po.product_code,
            COUNT(DISTINCT po.po_id) AS distinct_po_count,
            SUM(po.oo) + SUM(po.it) AS commited_receipt_units
        FROM oms.oms_po_master po
        GROUP BY po.loc_code, po.product_code
    ),
    paf_kpi_oor AS (
        SELECT
            ' || v_cte_columns || '
        FROM sorted_data oor
        INNER JOIN ' || v_paf_inner_sql || ' paf
            ON ' || v_paf_join_condition || '
        ' || CASE WHEN v_additional_join <> '' THEN v_additional_join ELSE '' END || '
    )
    SELECT * FROM (
        SELECT
            ' || v_select_columns || '
        FROM oms.oms_alerts alerts
        INNER JOIN paf_kpi_oor pko
            ON ' || v_alerts_pko_join || '
        LEFT JOIN distinct_po_counts po
            ON pko.product_code = po.product_code AND pko.loc_code = po.loc_code
        LEFT JOIN article_loc_code_distinct oclt
            ON alerts.article = oclt.article AND alerts.loc_code = oclt.loc_code
        ' || CASE WHEN v_outer_additional_joins <> '' THEN v_outer_additional_joins ELSE '' END || '
        WHERE ' || v_alert_base_where || '
        ' || CASE
                WHEN filter_reviewed_orders THEN ' AND NOT alerts.is_pending_order_resolved = TRUE'
                ELSE ''
           END || '
        ' || CASE WHEN v_additional_filters <> '' THEN ' AND ' || v_additional_filters ELSE '' END || '
        GROUP BY ' || v_select_group_by || '
    ) X
    ' || v_search_cls || '
    ' || v_sort_cls || '
    ' || v_limit_cls;

    BEGIN
        OPEN input FOR EXECUTE v_sql;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error executing pending orders dynamic SQL: % (SQLSTATE: %)',
                SQLERRM, SQLSTATE;
    END;

    PERFORM global.sp_log(
        v_gen_random_uuid,
        'oms.get_oms_alert_pending_orders_details_dynamic',
        'Execution completed',
        v_sql,
        jsonb_build_object(
            'filter_reviewed_orders', filter_reviewed_orders
        )
    );

    RETURN input;
END;
$function$;
