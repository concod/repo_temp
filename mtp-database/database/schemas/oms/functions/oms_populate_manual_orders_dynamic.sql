--liquibase formatted sql
--changeset cascade:oms_populate_manual_orders_dynamic_v3 runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic configuration-driven SP for oms_populate_manual_orders - hardcoded query template with oms schema, config-driven columns/flags

DROP FUNCTION IF EXISTS oms.oms_populate_manual_orders_dynamic(refcursor, jsonb, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.oms_populate_manual_orders_dynamic(jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.oms_populate_manual_orders_dynamic(
    store_filter jsonb,
    product_filter jsonb,
    meta_filter jsonb,
    sp_config jsonb DEFAULT NULL
)
RETURNS TABLE(
    article character varying,
    pack_id text,
    product_name character varying,
    product_description character varying,
    l0_name character varying,
    primary_vendor_name character varying,
    vendor character varying,
    product_type character varying,
    l2_name character varying,
    l1_name character varying,
    l3_name character varying,
    loc_code character varying,
    article_loc_code character varying,
    unique_row_id character varying,
    is_pack_enabled boolean,
    min_order_quantity_style integer,
    max_order_quantity_style integer,
    manufacturing_lead_time numeric,
    vendor_lead_time numeric,
    lead_time numeric,
    safety_stock numeric,
    open_receipt_units numeric,
    system_inv numeric,
    dc_inv numeric,
    order_placement_date date,
    order_quantity_eaches numeric,
    sum_order_cost numeric,
    size_column text,
    expected_receipt_date date,
    status_obj jsonb
)
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Populate Manual Orders SP (Backend-Driven Config)

  All tables use oms schema (replaces inventory_smart for non-Primark tenants).
  Query template is hardcoded; config controls columns, flags, and joins.

  Parameters:
    store_filter:   JSONB store/location filter
    product_filter: JSONB product attribute filter
    meta_filter:    JSONB with search/sort/limit/offset
    sp_config:      JSONB from backend (built from oms_sp_config_columns + oms_sp_config_filters):
      {
        -- From oms_sp_config_filters (filter_type=config)
        "form_filter_table":       "ph_master",
        "has_size_distribution":   true|false,
        "has_pack_config":         true|false,
        "has_fiscal_calendar":     true|false,
        "has_article_status_tag":  true|false,
        "has_saf_cte":             true|false,
        "has_oms_orders_recommended_join": true|false,
        "constraints_where":       "" | "WHERE ocl.default_mode = 1",
        "sdd_fiscal_week_style":   "subquery"|"to_char",

        -- From oms_sp_config_filters (filter_type=paf_column, joined by backend)
        "paf_columns":       "product_code, article, ...",
        -- From oms_sp_config_filters (filter_type=paf_filter)
        "paf_filter":        "AND ordering = 'Y'",
        -- From oms_sp_config_filters (filter_type=cte_column, joined by backend as cte_columns)
        "cte_columns":       "ok.product_code as ok_product_code, ok.loc_code, ...",
        -- From oms_sp_config_filters (filter_type=constraints_column, joined by backend)
        "constraints_columns": "ocl.article as ocl_article, ocl.lead_time, ...",
        -- From oms_sp_config_filters (filter_type=constraints_join)
        "constraints_join":  "paf.article = const_data.ocl_article",
        -- From oms_sp_config_filters (filter_type=kpi_join)
        "kpi_join":          "paf.product_code = kpi.ok_product_code",
        -- From oms_sp_config_filters (filter_type=sdd_join)
        "sdd_join":          "paf.product_code = sdd.dsr_product_code AND ...",
        -- From oms_sp_config_filters (filter_type=additional_join)
        "additional_join":   "LEFT JOIN oms.oms_pack_config opc ON ...",
        -- From oms_sp_config_filters (filter_type=raw_data_column, joined by backend as raw_data_columns)
        "raw_data_columns":  "paf.article, paf.l2_name, ..., kpi.cost, ..., const_data.lead_time, ...",

        -- From oms_sp_config_columns (backend assembles from is_group_by/expression)
        "select_columns":      "agg.article, agg.pack_id, ...",
        "select_group_by":     "1,2,3,...",

        -- From oms_sp_config_filters (filter_type=inner_agg_select, joined by backend)
        "inner_agg_select":    "rd.article, ..., AVG(rd.cost) AS order_cost, ...",
        -- From oms_sp_config_filters (filter_type=inner_agg_group_by, joined by backend)
        "inner_agg_group_by":  "rd.article, rd.primary_vendor_name, ...",
        -- From oms_sp_config_filters (filter_type=status_obj_field, joined by backend)
        "status_obj_fields":   "'cost', agg.order_cost, 'month', agg.max_month, ...",
        -- From oms_sp_config_filters (filter_type=status_obj_order_by)
        "status_obj_order_by": "agg.size_column",
        -- From oms_sp_config_filters (filter_type=outer_group_by, joined by backend)
        "outer_group_by":      "agg.article, agg.pack_id, ..., expected_receipt_date",

        -- Order clause replacements (Lovisa/Briscoes)
        "order_replacements":  {"store_inv": "MAX(A.store_inv)", ...}
      }
*/
DECLARE
    v_manual_orders_sql  TEXT := '';
    v_pa_sql             TEXT := '';
    v_sa_sql             TEXT := '';
    v_meta_cls           TEXT := '';
    v_where_clause       TEXT := '';
    v_limit_clause       TEXT := '';
    v_order_clause       TEXT := '';
    v_size_sort          jsonb := NULL;
    v_order_direction    TEXT := '';
    v_gen_random_uuid    TEXT := gen_random_uuid()::varchar;
    v_error_message      TEXT;
    _key                 TEXT;
    i                    INT;

    -- Config: flags
    v_form_filter_table          TEXT;
    v_has_size_distribution      BOOLEAN;
    v_has_pack_config            BOOLEAN;
    v_has_fiscal_calendar        BOOLEAN;
    v_has_article_status_tag     BOOLEAN;
    v_has_saf_cte                BOOLEAN;
    v_has_oor_join               BOOLEAN;
    v_constraints_where          TEXT;
    v_sdd_fiscal_week_style      TEXT;

    -- Config: columns & fragments from filters CSV
    v_paf_columns                TEXT;
    v_paf_columns_prefixed       TEXT;
    v_paf_filter                 TEXT;
    v_kpi_columns                TEXT;
    v_constraints_columns        TEXT;
    v_constraints_join           TEXT;
    v_kpi_join                   TEXT;
    v_sdd_join                   TEXT;
    v_additional_join            TEXT;
    v_raw_data_columns           TEXT;

    -- Config: columns from columns CSV (assembled by backend)
    v_select_columns             TEXT;
    v_select_group_by            TEXT;

    -- Config: fragments from filters CSV (assembled by backend)
    v_inner_agg_select           TEXT;
    v_inner_agg_group_by         TEXT;
    v_status_obj_fields          TEXT;
    v_status_obj_order_by        TEXT;
    v_outer_group_by             TEXT;

    -- Config: order replacements
    v_order_replacements         jsonb;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- =========================================================================
    -- 1. Extract configuration
    -- =========================================================================
    v_form_filter_table      := COALESCE(sp_config->>'form_filter_table', 'ph_master');
    v_has_size_distribution  := COALESCE((sp_config->>'has_size_distribution')::boolean, false);
    v_has_pack_config        := COALESCE((sp_config->>'has_pack_config')::boolean, false);
    v_has_fiscal_calendar    := COALESCE((sp_config->>'has_fiscal_calendar')::boolean, false);
    v_has_article_status_tag := COALESCE((sp_config->>'has_article_status_tag')::boolean, false);
    v_has_saf_cte            := COALESCE((sp_config->>'has_saf_cte')::boolean, false);
    v_has_oor_join           := COALESCE((sp_config->>'has_oms_orders_recommended_join')::boolean, false);
    v_constraints_where      := COALESCE(sp_config->>'constraints_where', '');
    v_sdd_fiscal_week_style  := COALESCE(sp_config->>'sdd_fiscal_week_style', 'subquery');

    v_paf_columns            := COALESCE(sp_config->>'paf_columns', 'product_code, article');
    v_paf_columns_prefixed   := 'paf.' || regexp_replace(v_paf_columns, ',\s*', ', paf.', 'g');
    v_paf_filter             := COALESCE(sp_config->>'paf_filter', '');
    v_kpi_columns            := COALESCE(sp_config->>'cte_columns', 'ok.product_code, ok.loc_code');
    v_constraints_columns    := COALESCE(sp_config->>'constraints_columns', 'ocl.article as ocl_article, ocl.lead_time');
    v_constraints_join       := COALESCE(sp_config->>'constraints_join', 'paf.article = const_data.ocl_article');
    v_kpi_join               := COALESCE(sp_config->>'kpi_join', 'paf.product_code = kpi.ok_product_code');
    v_sdd_join               := COALESCE(sp_config->>'sdd_join', '');
    v_additional_join        := COALESCE(sp_config->>'additional_join', '');
    v_raw_data_columns       := COALESCE(sp_config->>'raw_data_columns', '');

    v_select_columns         := sp_config->>'select_columns';
    v_select_group_by        := COALESCE(sp_config->>'select_group_by', '');
    v_inner_agg_select       := COALESCE(sp_config->>'inner_agg_select', '');
    v_inner_agg_group_by     := COALESCE(sp_config->>'inner_agg_group_by', '');
    v_status_obj_fields      := COALESCE(sp_config->>'status_obj_fields', '');
    v_status_obj_order_by    := COALESCE(sp_config->>'status_obj_order_by', '');
    v_outer_group_by         := COALESCE(sp_config->>'outer_group_by', '');

    v_order_replacements     := COALESCE(sp_config->'order_replacements', '{}'::jsonb);

    -- Validate required fields
    IF v_select_columns IS NULL OR v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    -- Clean up literal \n from columns
    v_select_columns    := REPLACE(v_select_columns, E'\\n', ' ');
    v_inner_agg_select  := REPLACE(v_inner_agg_select, E'\\n', ' ');

    RAISE NOTICE 'DEBUG select_columns: %', v_select_columns;
    RAISE NOTICE 'DEBUG inner_agg_select: %', v_inner_agg_select;

    -- =========================================================================
    -- 2. Generate product attribute filter (always uses oms schema)
    -- =========================================================================
    v_pa_sql := oms.form_main_table_filters(v_form_filter_table, product_filter);

    -- =========================================================================
    -- 3. Generate store attribute filter
    -- =========================================================================
    v_sa_sql := oms.form_main_table_filters(v_form_filter_table, store_filter);

    -- =========================================================================
    -- 4. Parse meta_filter (common across all tenants)
    -- =========================================================================
    IF meta_filter IS NOT NULL AND meta_filter <> '{}'::jsonb AND jsonb_typeof(meta_filter) = 'object' THEN
        -- Extract and remove size sort from sort array
        IF meta_filter->'sort' IS NOT NULL AND jsonb_array_length(meta_filter->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(meta_filter->'sort')-1 LOOP
                IF (meta_filter->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := meta_filter->'sort'->i;
                    meta_filter := jsonb_set(
                        meta_filter,
                        '{sort}',
                        (meta_filter->'sort') - i
                    );
                    EXIT;
                END IF;
            END LOOP;
        END IF;

        -- Handle size sorting direction
        IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
            v_order_direction := 'DESC';
        ELSE
            v_order_direction := 'ASC';
        END IF;

        v_meta_cls := global.form_table_query(meta_filter);

        -- Extract WHERE clause
        IF v_meta_cls ~* 'WHERE' THEN
            v_where_clause := substring(v_meta_cls FROM 'WHERE\s.*?(?=\sORDER\sBY|\sLIMIT|\sOFFSET|$)');
        END IF;

        -- Extract LIMIT/OFFSET clause
        IF v_meta_cls ~* 'LIMIT' THEN
            v_limit_clause := substring(v_meta_cls FROM 'LIMIT\s.*$');
        END IF;

        -- Extract ORDER BY clause
        IF v_meta_cls ~* 'ORDER BY' THEN
            v_order_clause := substring(v_meta_cls FROM 'ORDER\sBY\s.*?(?=\sLIMIT|\sOFFSET|$)');
        END IF;

        -- Apply order clause column replacements from config
        IF v_order_clause IS NOT NULL AND v_order_clause <> '' 
           AND v_order_replacements IS NOT NULL 
           AND jsonb_typeof(v_order_replacements) = 'object' THEN
            FOR _key IN SELECT * FROM jsonb_object_keys(v_order_replacements)
            LOOP
                v_order_clause := regexp_replace(
                    v_order_clause,
                    '(^|[^A-Za-z0-9_\.])"?' || _key || '"?([^A-Za-z0-9_]|$)',
                    E'\\1' || (v_order_replacements->>_key) || E'\\2',
                    'gi'
                );
            END LOOP;
        END IF;
    END IF;

    -- =========================================================================
    -- 5. Build query with hardcoded template (oms schema throughout)
    -- =========================================================================
    v_manual_orders_sql := 'WITH ';

    -- 5a. SAF CTE (optional: VS, Figs, Spanx)
    IF v_has_saf_cte THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        saf_data AS MATERIALIZED (
            SELECT saf.dc_name, saf.store_code, saf.channel
            FROM (SELECT dc_name, store_code, channel
                  FROM "global".store_attributes_filter ' || v_sa_sql || ') saf
        ), ';
    END IF;

    -- 5b. PAF CTE
    v_manual_orders_sql := v_manual_orders_sql || '
    paf_data AS (
        SELECT ' || v_paf_columns_prefixed;

    IF v_has_article_status_tag THEN
        v_manual_orders_sql := v_manual_orders_sql || ',
            ast."order" as size_order';
    END IF;

    v_manual_orders_sql := v_manual_orders_sql || '
        FROM (SELECT ' || v_paf_columns || '
              FROM "global".product_attributes_filter ' || v_pa_sql || ' ' || v_paf_filter || ') paf';

    IF v_has_article_status_tag THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        LEFT JOIN oms.article_status_tag ast
            ON paf.product_code = ast.product_code AND paf.size = ast.size';
    END IF;

    v_manual_orders_sql := v_manual_orders_sql || '
    ),';

    -- 5c. Size distribution CTE (optional)
    IF v_has_size_distribution THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        size_distribution_data AS MATERIALIZED (
            SELECT
                dsr.product_code AS dsr_product_code,
                dsr.loc_code AS dsr_loc_code,
                dsr.article AS dsr_article,
                dsr.size AS dsr_size,
                ROUND(SUM(dsr.penetration)::NUMERIC, 2) AS size_distribution_percentage
            FROM oms.dc_split_ratio dsr';

        IF v_sdd_fiscal_week_style = 'subquery' THEN
            v_manual_orders_sql := v_manual_orders_sql || '
            WHERE dsr.fiscal_year_week = (
                SELECT fiscal_year_week FROM global.fiscal_date_mapping
                WHERE calendar_date = current_date
            )';
        ELSIF v_sdd_fiscal_week_style = 'to_char' THEN
            v_manual_orders_sql := v_manual_orders_sql || '
            WHERE to_char(current_date, ''YYYYIW'') = dsr.fiscal_year_week::character varying';
        ELSIF v_sdd_fiscal_week_style = 'fdm_join' THEN
            v_manual_orders_sql := v_manual_orders_sql || '
            INNER JOIN global.fiscal_date_mapping fdm
                ON dsr.fiscal_year_week = fdm.fiscal_year_week
            WHERE fdm.calendar_date = current_date';
        END IF;

        v_manual_orders_sql := v_manual_orders_sql || '
            GROUP BY dsr.product_code, dsr.loc_code, dsr.article, dsr.size
        ),';
    END IF;

    -- 5d. Distribution centers CTE
    v_manual_orders_sql := v_manual_orders_sql || '
    distribution_centers_data AS MATERIALIZED (
        SELECT DISTINCT dc.linked_store_code, dc.dc_code
        FROM global.distribution_centres dc
        WHERE NOT dc.is_deleted
    ),';

    -- 5e. KPI CTE
    v_manual_orders_sql := v_manual_orders_sql || '
    kpi_data AS (
        SELECT ' || v_kpi_columns || '
        FROM oms.oms_kpi ok';

    IF v_additional_join <> '' THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        ' || v_additional_join;
    END IF;

    v_manual_orders_sql := v_manual_orders_sql || '
    ),';

    -- 5f. Constraints CTE (optional)
    IF v_constraints_columns <> '' THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        constraints_data AS (
            SELECT ' || v_constraints_columns || '
            FROM oms.oms_constraints_lead_time ocl';

        IF v_constraints_where <> '' THEN
            v_manual_orders_sql := v_manual_orders_sql || '
            ' || v_constraints_where;
        END IF;

        v_manual_orders_sql := v_manual_orders_sql || '
        ),';
    END IF;

    -- 5g. Fiscal calendar CTE (optional)
    IF v_has_fiscal_calendar THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        fiscal_calendar_data AS MATERIALIZED (
            SELECT fw_id, fm_id, fy, fq_id, fw_start_date, fm_name
            FROM global.fc_fy_fw_level
            WHERE date = current_date
        ),';
    END IF;

    -- 5h. Raw data CTE (assembles all joins)
    v_manual_orders_sql := v_manual_orders_sql || '
    raw_data AS (
        SELECT DISTINCT
            ' || v_raw_data_columns || '
        FROM paf_data paf
        INNER JOIN kpi_data kpi ON ' || v_kpi_join || '
        INNER JOIN distribution_centers_data dcd ON dcd.linked_store_code = kpi.loc_code';

    IF v_has_fiscal_calendar THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        CROSS JOIN fiscal_calendar_data fcd';
    END IF;

    IF v_has_size_distribution AND v_sdd_join <> '' THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        INNER JOIN size_distribution_data sdd ON ' || v_sdd_join;
    END IF;

    IF v_has_saf_cte THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        INNER JOIN saf_data saf ON saf.store_code = dcd.linked_store_code';
    END IF;

    IF v_constraints_columns <> '' THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        LEFT JOIN constraints_data const_data ON ' || v_constraints_join;
    END IF;

    IF v_has_oor_join THEN
        v_manual_orders_sql := v_manual_orders_sql || '
        LEFT JOIN oms.oms_orders_recommended oor
            ON paf.product_code = oor.product_code
            AND kpi.loc_code = oor.loc_code
            AND oor.order_status_id = 0
            AND NOT oor.is_deleted';
    END IF;

    v_manual_orders_sql := v_manual_orders_sql || '
    )';

    -- =========================================================================
    -- 6. Assemble final SELECT
    -- =========================================================================
    IF v_inner_agg_select <> '' AND v_inner_agg_group_by <> '' THEN
        -- Two-level aggregation (Primark/CrackerBarrel/Starboard)
        -- Inner: SELECT ... FROM raw_data rd GROUP BY ...
        -- Outer: SELECT select_columns, status_obj FROM (inner) agg GROUP BY outer_group_by
        v_manual_orders_sql := v_manual_orders_sql || '
        SELECT * FROM (
            SELECT ' || v_select_columns || ',
                jsonb_agg(
                    jsonb_build_object(' || v_status_obj_fields || ')';

        IF v_status_obj_order_by <> '' THEN
            v_manual_orders_sql := v_manual_orders_sql || ' ORDER BY ' || v_status_obj_order_by;
        END IF;

        v_manual_orders_sql := v_manual_orders_sql || '
                ) AS status_obj
            FROM (
                SELECT ' || v_inner_agg_select || '
                FROM raw_data rd
                GROUP BY ' || v_inner_agg_group_by || '
            ) agg
            ' || v_where_clause || '
            GROUP BY ' || v_outer_group_by || '
            ' || v_order_clause || '
            ' || v_limit_clause || '
        ) x';
    ELSE
        -- Single-level aggregation (VS/Carters/Lovisa/Briscoes/Figs/Spanx)
        -- SELECT select_columns, status_obj FROM raw_data A GROUP BY outer_group_by
        v_manual_orders_sql := v_manual_orders_sql || '
        SELECT ' || v_select_columns || ',
            jsonb_agg(
                jsonb_build_object(' || v_status_obj_fields || ')';

        IF v_status_obj_order_by <> '' THEN
            v_manual_orders_sql := v_manual_orders_sql || ' ORDER BY ' || v_status_obj_order_by;
        END IF;

        v_manual_orders_sql := v_manual_orders_sql || '
            ) AS status_obj
        FROM raw_data A
        ' || v_where_clause || '
        GROUP BY ' || v_outer_group_by || '
        ' || v_order_clause || '
        ' || v_limit_clause;
    END IF;

    -- =========================================================================
    -- 7. Execute and return
    -- =========================================================================
    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;

    RETURN QUERY EXECUTE v_manual_orders_sql;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;

        DECLARE
            v_detail TEXT;
            v_hint TEXT;
        BEGIN
            GET STACKED DIAGNOSTICS
                v_detail = PG_EXCEPTION_DETAIL,
                v_hint = PG_EXCEPTION_HINT;

            PERFORM global.sp_log(
                v_gen_random_uuid,
                'oms.oms_populate_manual_orders_dynamic',
                'ERROR',
                v_error_message,
                jsonb_build_object(
                    'sqlstate', SQLSTATE,
                    'detail', v_detail,
                    'hint', v_hint
                )
            );

            RAISE EXCEPTION 'Dynamic SP failed: % (SQLSTATE: %) DETAIL: % SQL: %', v_error_message, SQLSTATE, v_detail, LEFT(v_manual_orders_sql, 10000);
        END;
END;
$function$;
