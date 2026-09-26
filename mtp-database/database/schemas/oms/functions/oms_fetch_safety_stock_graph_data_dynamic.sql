--liquibase formatted sql
--changeset hari.anjaneyulu@impactanalytics.co:oms_fetch_safety_stock_graph_data_dynamic_v1 runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic configuration-driven SP for safety stock graph data

DROP FUNCTION IF EXISTS oms.oms_fetch_safety_stock_graph_data_dynamic(refcursor, varchar, varchar, jsonb);

CREATE OR REPLACE FUNCTION oms.oms_fetch_safety_stock_graph_data_dynamic(
    input refcursor,
    p_article varchar,
    p_loc_code varchar,
    sp_config jsonb DEFAULT NULL
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Safety Stock Graph Data SP (Backend-Driven Config)
  
  Purpose: Fetch safety stock graph data based on service level coefficients
           Configuration-driven to support multiple tenants with different schemas
           and filter columns.
  
  Parameters:
    $1: input - Refcursor for result set
    $2: p_article - Article code to filter by
    $3: p_loc_code - Location code to filter by
    $4: sp_config - JSONB with configuration (fetched by backend)
        {
          "paf_columns": "article" | "product_code" | "article, product_code",
          "paf_distinct_column": "product_code" (optional, for DISTINCT ON),
          "paf_join_condition": "ok.product_code = paf.product_code",
          "paf_filter_column": "article" | "l4_name"
        }
        
  Note: 
    - When using paf_distinct_column, the column will be automatically 
      included in the SELECT list even if not in paf_columns
    - Schema is hardcoded to 'oms' (oms_kpi, oms_sl_coeff)
  
  Usage:
    -- For Primark (DISTINCT ON):
    SELECT oms.oms_fetch_safety_stock_graph_data_dynamic(
      'my_cursor', 
      'ARTICLE_123', 
      'LOC_001',
      '{
        "paf_columns": "article", 
        "paf_distinct_column": "product_code",
        "paf_join_condition": "ok.product_code = paf.product_code",
        "paf_filter_column": "article"
      }'::jsonb
    );
    FETCH ALL FROM my_cursor;
    
    -- For Lovisa (uses l4_name):
    SELECT oms.oms_fetch_safety_stock_graph_data_dynamic(
      'my_cursor', 
      'L4_NAME_VALUE', 
      'LOC_001',
      '{
        "paf_columns": "l4_name",
        "paf_join_condition": "ok.product_code = paf.l4_name",
        "paf_filter_column": "l4_name"
      }'::jsonb
    );
    FETCH ALL FROM my_cursor;
  
  Returns: Refcursor with columns:
    - service_level (numeric)
    - safety_stock (numeric)
*/
DECLARE
    v_query TEXT;
    v_paf_columns TEXT := '';
    v_paf_distinct_columns TEXT := '';
    v_paf_select TEXT := '';
    v_paf_join_condition TEXT := '';
    v_paf_filter TEXT := '';
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
BEGIN
    -- Extract configuration or use defaults
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;
    
    -- Validate inputs
    IF p_article IS NULL OR p_article = '' THEN
        RAISE EXCEPTION 'Article/L4 value is required';
    END IF;
    
    IF p_loc_code IS NULL OR p_loc_code = '' THEN
        RAISE EXCEPTION 'Location code is required';
    END IF;

    -- Extract configuration components
    v_paf_columns := sp_config->>'paf_columns';
    v_paf_distinct_columns := COALESCE(sp_config->>'paf_distinct_column', '');
    v_paf_join_condition := COALESCE(sp_config->>'paf_join_condition', 'ocss.article = paf.article');
    v_paf_filter := COALESCE(sp_config->>'paf_filter_column', 'article');


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
    
    -- Build dynamic query with all keys configurable
    -- Uses format() with %I for identifiers and %L for literals
    v_query := format('
        SELECT 
            osc.service_level,
            osc.coeff * (
                SELECT COALESCE(SUM(ok.ss_base), 0) 
                FROM oms.oms_kpi ok
                JOIN (
                    SELECT ' || v_paf_select || '
                    FROM global.product_attributes_filter 
                    WHERE ordering = ''Y'' 
                      AND ' || v_paf_filter || ' = %L
                ) paf ON ' || v_paf_join_condition || ' 
                WHERE ok.loc_code = %L
            ) AS safety_stock  
        FROM oms.oms_sl_coeff osc
        ORDER BY osc.service_level', 
        p_article,                   -- %L - article/l4_name value (literal)
        p_loc_code                   -- %L - loc_code value (literal)
    );
    RAISE NOTICE 'Generated SQL: %', v_query;
    BEGIN
        -- Execute the dynamically built query
        -- All values are already safely formatted via format() with %L
        OPEN input FOR EXECUTE v_query;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)', 
                v_error_message, SQLSTATE;
    END;
    
    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.oms_fetch_safety_stock_graph_data_dynamic', 
        'Execution completed',
        v_query,
        jsonb_build_object(
            'article', p_article, 
            'loc_code', p_loc_code,
            'config_provided', sp_config IS NOT NULL,
            'paf_columns', v_paf_columns,
            'paf_distinct_columns', v_paf_distinct_columns,
            'paf_join_condition', v_paf_join_condition,
            'paf_filter_column', v_paf_filter,
            'paf_select_generated', v_paf_select
        )
    );
    
    RETURN input;
    
EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.oms_fetch_safety_stock_graph_data_dynamic', 
            'ERROR',
            v_error_message,
            jsonb_build_object(
                'article', p_article, 
                'loc_code', p_loc_code,
                'sqlstate', SQLSTATE
            )
        );
        
        -- Re-raise with context
        RAISE EXCEPTION 'Dynamic SP failed: % (SQLSTATE: %)', 
            v_error_message, SQLSTATE;
END;
$function$;

