--liquibase formatted sql
--changeset hari.anjaneyulu@impactanalytics.co:oms_get_oms_constraints_safety_stock_demand_twos_dynamic_v4 runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic configuration-driven SP for safety stock demand TWOS constraints

DROP FUNCTION IF EXISTS oms.get_oms_constraints_safety_stock_demand_twos_dynamic(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_constraints_safety_stock_demand_twos_dynamic(
    input refcursor,
    product_filter jsonb,
    meta_json jsonb,
    sp_config jsonb DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Safety Stock Demand TWOS Constraints SP (Backend-Driven Config)
  
  This SP returns safety stock constraints filtered by order_strategy 
  ('Week of Supply', 'Weeks of Supply', 'Target WOS')

  Parameters:
    $1: input - Refcursor for result set
    $2: product_filter - JSONB with product attribute filters
    $3: meta_json - JSONB with pagination, sorting, search
    $4: sp_config - JSONB with configuration (fetched by backend)
        {
          "select_columns": "X.x_article as article, X.id, X.x_article, ...",
          "select_group_by": "1,2,3,4,5,6,7,8",
          "paf_distinct_columns": "l4_name" (optional, for DISTINCT ON - Lovisa case),
          "paf_columns": "article, l1_name, l2_name, l3_name, l4_name, product_code, ...",
          "paf_group_by": "1,2,3,...",
          "paf_join_condition": "ocss.article = paf.article",
          "paf_filter": "AND paf.active AND paf.ordering = 'Y'",
          "additional_join": "LEFT JOIN global.user_master u ON u.user_code = ocss.created_by",
          "query_replacements": {"article": "X.x_article"}
        }
        
        PAF Join Logic:
        - If paf_columns is empty: Direct join to global.product_attributes_filter (all columns)
        - If paf_columns is set without paf_distinct_columns: Subquery with specified columns
        - If both paf_columns and paf_distinct_columns are set: Subquery with DISTINCT ON (Lovisa)
        
        DC Join (Hardcoded):
        - INNER JOIN global.distribution_centres dc ON ocss.loc_code = dc.linked_store_code AND NOT dc.is_deleted
        
        The entire query is constructed in one place for better readability.

  Usage:
    SELECT * FROM oms.get_oms_constraints_safety_stock_demand_twos_dynamic(
      'my_cur',
      '{"l2_name": [{"type": "list","operator": "in", "values": ["Allocator"]}]}',
      '{"limit": {"limit": 10, "page": 1}}',
      '{"select_columns": "...", "inner_select_columns": "...", ...}'
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
    v_paf_join_condition TEXT := '';
    v_paf_filter TEXT := '';
    v_additional_join TEXT := '';
    v_additional_filters TEXT := '';
    v_query_replacements JSONB;
    v_constraints_safety_stock_sql TEXT := '';
    _query_pa TEXT;
    _query_order TEXT;
    _key TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;
    RAISE NOTICE 'sp_config: %', sp_config;
    -- Extract configuration components
    v_select_columns := sp_config->>'select_columns';
    v_select_group_by := COALESCE(sp_config->>'select_group_by', '');
    v_paf_columns := COALESCE(sp_config->>'paf_columns', '');
    v_paf_distinct_columns := COALESCE(sp_config->>'paf_distinct_columns', '');
    v_paf_group_by := COALESCE(sp_config->>'paf_group_by', '');
    v_paf_join_condition := COALESCE(sp_config->>'paf_join_condition', 'ocss.article = paf.article');
    v_paf_filter := COALESCE(sp_config->>'paf_filter', 'AND paf.active');
    v_additional_join := COALESCE(sp_config->>'additional_join', '');
    v_additional_filters := COALESCE(sp_config->>'additional_filters', '');
    v_query_replacements := sp_config->'query_replacements';

    -- Validate required fields
    IF v_select_columns IS NULL OR v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    -- Clean up literal \n from columns
    v_select_columns := REPLACE(v_select_columns, E'\\n', ' ');
    v_paf_columns := REPLACE(v_paf_columns, E'\\n', ' ');
    

    -- Build product filter query
    _query_pa := oms.form_main_table_filters('ph_master', product_filter);
    RAISE DEBUG 'Product filter query: %', _query_pa;

    _query_order := global.form_table_query(meta_json);
    RAISE DEBUG 'Order/pagination query: %', _query_order;

    -- Apply query replacements
    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements)
        LOOP
            _query_order := REPLACE(_query_order, _key, v_query_replacements->>_key);
            _query_pa := REPLACE(_query_pa, ' ' || _key || ' ', ' ' || (v_query_replacements->>_key) || ' ');
            RAISE DEBUG 'Applied replacement: % -> %', _key, v_query_replacements->>_key;
        END LOOP;
    END IF;
    -- Build PAF SELECT clause based on configuration
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

    -- Build the complete SQL query with subquery structure
    -- Outer query calculates is_wos_demand_disabled and filters by order_strategy
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
      ' INNER JOIN global.distribution_centres dc ON ocss.loc_code = dc.linked_store_code and
          not dc.is_deleted ' ||
      v_additional_join || '
      LEFT JOIN (
        SELECT article, MAX(order_strategy) AS order_strategy
        FROM oms.oms_constraints_order_policy
        GROUP BY article
      ) ocop ON ocss.article = ocop.article' ||
      CASE 
          WHEN v_paf_select = '' THEN 
            -- _query_pa may contain WHERE clause, so append with AND
            CASE 
              WHEN _query_pa IS NOT NULL AND _query_pa != '' THEN 
                _query_pa || ' AND ocop.order_strategy IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'') '
              ELSE 
                ' WHERE ocop.order_strategy IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'') '
            END
          ELSE 
            -- No _query_pa, so add WHERE directly
            ' WHERE ocop.order_strategy IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'') '
      END ||
      ' GROUP BY ' || v_select_group_by || 
      '
    ) X
    ' || _query_order;

    RAISE NOTICE 'Generated SQL (length: % chars)', LENGTH(v_constraints_safety_stock_sql);
    RAISE NOTICE 'Full SQL: %', v_constraints_safety_stock_sql;

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
        'oms.get_oms_constraints_safety_stock_demand_twos_dynamic', 
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
            'oms.get_oms_constraints_safety_stock_demand_twos_dynamic', 
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




