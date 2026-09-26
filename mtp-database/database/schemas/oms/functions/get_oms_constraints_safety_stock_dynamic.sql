--liquibase formatted sql
--changeset hari.anjaneyulu@impactanalytics.co:oms_get_oms_constraints_safety_stock_dynamic_v5 runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic configuration-driven SP for safety stock constraints - updated to single-level query structure (no subquery) to match all static SPs

DROP FUNCTION IF EXISTS oms.get_oms_constraints_safety_stock_dynamic(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_constraints_safety_stock_dynamic(
    input refcursor,
    product_filter jsonb,
    meta_json jsonb,
    sp_config jsonb DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Safety Stock Constraints SP (Backend-Driven Config)

  Parameters:
    $1: input - Refcursor for result set
    $2: product_filter - JSONB with product attribute filters
    $3: meta_json - JSONB with pagination, sorting, search
    $4: sp_config - JSONB with configuration (fetched by backend)
        {
          "select_columns": "ocss.id, ocss.article as x_article, ..., CASE WHEN ocop.order_strategy NOT IN ('Week of Supply', 'Weeks of Supply', 'Target WOS') THEN true ELSE false END AS is_wos_demand_disabled",
          "select_group_by": "ocss.id, ocss.article, ..., ocop.order_strategy",
          "paf_distinct_columns": "l4_name" (optional, for DISTINCT ON - Lovisa case),
          "paf_columns": "article, l2_name, l3_name, ...",
          "paf_group_by": "1,2,3,...",
          "additional_join": "LEFT JOIN oms.oms_pack_config opc ON...",
          "additional_filters": "AND ocss.is_active = true",
          "query_replacements": {"article": "X.x_article"},
          "paf_filter": "AND paf.active AND NOT dc.is_deleted",
          "paf_join_condition": "ocss.article = paf.article",
        }
        
        Note: is_wos_demand_disabled column must be included in select_columns config.
        The ocop join is automatically added by the SP for WOS check calculation.

  Usage:
    SELECT * FROM oms.get_oms_constraints_safety_stock_dynamic(
      'my_cur',
      '{"l2_name": [{"type": "list","operator": "in", "values": ["Allocator"]}]}',
      '{"limit": {"limit": 10, "page": 1}}',
      '{"select_columns": "...", "paf_columns": "...", ...}'
    );
    FETCH ALL IN "my_cur";

  Returns: Generated SQL query text
*/
DECLARE
    v_select_columns TEXT := '';
    v_select_group_by TEXT := '';
    v_paf_columns TEXT := '';
    v_paf_distinct_columns TEXT := '';
    v_paf_group_by TEXT := '';
    v_paf_select TEXT := '';
    v_additional_join TEXT := '';
    v_additional_filters TEXT := '';
    v_query_replacements JSONB;
    v_constraints_safety_stock_sql TEXT := '';
    _query_pa TEXT;
    _query_order TEXT;
    _key TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
    v_paf_join_condition TEXT;
    v_paf_filter TEXT;
    v_user_set_config JSONB;
    v_pack_config_enabled BOOLEAN := false;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- Extract configuration components
    v_select_columns := sp_config->>'select_columns';
    v_select_group_by := sp_config->>'select_group_by';
    v_paf_columns := sp_config->>'paf_columns';
    v_paf_group_by := sp_config->>'paf_group_by';
    v_paf_distinct_columns := COALESCE(sp_config->>'paf_distinct_columns', '');
    v_additional_join := COALESCE(sp_config->>'additional_join', '');
    v_additional_filters := COALESCE(sp_config->>'additional_filters', '');
    v_query_replacements := sp_config->'query_replacements';
    v_paf_join_condition := COALESCE(sp_config->>'paf_join_condition', 'ocss.article = paf.article');
    v_paf_filter := COALESCE(sp_config->>'paf_filter', 'AND paf.active');


    -- Clean up literal \n from columns
    v_select_columns := REPLACE(v_select_columns, E'\\n', ' ');
    v_paf_columns := REPLACE(v_paf_columns, E'\\n', ' ');

    -- Validate required fields
    IF v_select_columns IS NULL OR v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    IF v_select_group_by IS NULL OR v_select_group_by = '' THEN
        RAISE EXCEPTION 'select_group_by is required in sp_config';
    END IF;

    IF v_paf_columns IS NULL OR v_paf_columns = '' THEN
        RAISE WARNING 'No PAF columns configured, using article as default';
        v_paf_columns := 'article';
        v_paf_group_by := '1';
    END IF;

    RAISE NOTICE 'Using backend-provided configuration (select columns: % chars, paf columns: % chars)', 
        LENGTH(v_select_columns), LENGTH(v_paf_columns);

    -- Get user_set_config for pack config visibility
    v_user_set_config := COALESCE(sp_config->'user_set_config', '{}'::jsonb);
    
    -- Extract pack_config_visibility setting (default: false/disabled)
    v_pack_config_enabled := COALESCE(
        (v_user_set_config->'pack_config_visibility'->>0)::boolean,
        false
    );
    
    RAISE NOTICE 'Pack Config Visibility: %', v_pack_config_enabled;
    
    -- If pack config is enabled, add pack config column and join dynamically
    IF v_pack_config_enabled THEN
        -- Add pack_config column to select (check if opc.size exists to determine if pack config is present)
        v_select_columns := v_select_columns || ', CASE WHEN max(opc.size) IS NOT NULL THEN true ELSE false END AS pack_config';
        
        -- Add pack config join to additional_join
        v_additional_join := v_additional_join || ' LEFT JOIN oms.oms_pack_config opc ON ocss.article = opc.article';
        
        RAISE NOTICE 'Pack config column and join added dynamically';
    END IF;

    _query_pa := oms.form_main_table_filters('ph_master', product_filter);
    RAISE DEBUG 'Product filter query: %', _query_pa;

    _query_order := global.form_table_query(meta_json);
    RAISE DEBUG 'Order/pagination query: %', _query_order;

    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements)
        LOOP
            _query_order := REPLACE(_query_order, _key, v_query_replacements->>_key);
            _query_pa := REPLACE(_query_pa, ' ' || _key || ' ', ' ' || (v_query_replacements->>_key) || ' ');
            RAISE DEBUG 'Applied replacement: % -> %', _key, v_query_replacements->>_key;
        END LOOP;
    END IF;


    IF v_paf_distinct_columns != '' THEN
        -- Use DISTINCT ON
        -- Ensure distinct columns are included in the SELECT
        -- Build the column list: distinct_columns + other columns
        v_paf_select := 'DISTINCT ' || v_paf_distinct_columns;
    END IF;
    IF v_paf_columns != '' THEN
        IF v_paf_select != '' THEN
            v_paf_select := v_paf_select || ', ' || v_paf_columns;
        ELSE
            v_paf_select := v_paf_columns;
        END IF;
    ELSE
        v_paf_select := '';
    END IF;

-- Qualify column references in _query_pa with paf. alias when using direct join
    -- This prevents ambiguity when both ocss and paf tables have the same column names
    -- Only qualify when v_paf_select is empty (direct join case)
    IF v_paf_select = '' THEN
        -- Qualify column references with paf. alias when using direct join
        -- Pattern: (column_name::type -> (paf.column_name::type
        _query_pa := regexp_replace(_query_pa, E'\\(([a-zA-Z_][a-zA-Z0-9_]*)(::)', E'(paf.\\1\\2', 'g');
    END IF;


    -- Build the complete SQL query wrapped in subquery
    -- All columns including is_wos_demand_disabled come from select_columns config
    -- GROUP BY includes ocop.order_strategy if not already present
    -- Main query is wrapped in subquery, _query_order applied to outer SELECT
    v_constraints_safety_stock_sql := '
    SELECT * FROM (
      SELECT
        ' || v_select_columns || '
      FROM oms.oms_constraints_safety_stock ocss' ||
      CASE 
          WHEN v_paf_select != '' THEN
            ' INNER JOIN (' ||
              'SELECT ' || v_paf_select || ' ' ||
              'FROM global.product_attributes_filter' || _query_pa || ' ' || v_paf_filter ||
              CASE WHEN v_paf_group_by != '' THEN ' GROUP BY ' || v_paf_group_by ELSE '' END ||
            ') paf ON ' || v_paf_join_condition || ' '
          ELSE
            ' INNER JOIN global.product_attributes_filter paf '
            'ON ' || v_paf_join_condition || ' '
        END ||
       ' LEFT JOIN global.user_master um ON ocss.updated_by = um.user_code' ||
      ' LEFT JOIN global.user_master um2 ON ocss.created_by = um2.user_code' ||
      ' INNER JOIN global.distribution_centres dc ON ocss.loc_code = dc.linked_store_code and
          not dc.is_deleted ' ||
      v_additional_join || '
      LEFT JOIN (
        SELECT article, MAX(order_strategy) AS order_strategy
        FROM oms.oms_constraints_order_policy
        GROUP BY article
      ) ocop ON ocss.article = ocop.article' ||
      CASE 
          WHEN v_paf_select = '' THEN _query_pa || ' '
          ELSE ''
      END ||
      ' GROUP BY ' || v_select_group_by || 
      '
    ) X
    ' || _query_order;

    RAISE NOTICE 'my query: %', v_constraints_safety_stock_sql;
    -- Log the generated SQL for debugging
    RAISE NOTICE 'Generated SQL (length: % chars)', LENGTH(v_constraints_safety_stock_sql);
    RAISE DEBUG 'Full SQL: %', v_constraints_safety_stock_sql;

    BEGIN
        OPEN input FOR EXECUTE v_constraints_safety_stock_sql;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)', 
                v_error_message, SQLSTATE;
    END;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.get_oms_constraints_safety_stock_dynamic', 
        'Execution completed',
        v_constraints_safety_stock_sql,
        jsonb_build_object(
            'product_filter', product_filter, 
            'meta_json', meta_json,
            'config_provided', sp_config IS NOT NULL
        )
    );

    -- Return the SQL for logging/debugging
    RETURN v_constraints_safety_stock_sql;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.get_oms_constraints_safety_stock_dynamic', 
            'ERROR',
            v_error_message,
            jsonb_build_object(
                'product_filter', product_filter, 
                'meta_json', meta_json,
                'sqlstate', SQLSTATE
            )
        );
        
        -- Re-raise with context
        RAISE EXCEPTION 'Dynamic SP failed: % (SQLSTATE: %)', 
            v_error_message, SQLSTATE;
END;
$function$
;


