--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oms_get_oms_constraints_lead_time_dynamic_v7 runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic configuration-driven SP - backend provides config as JSONB parameter

DROP FUNCTION IF EXISTS oms.get_oms_constraints_lead_time_dynamic(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_constraints_lead_time_dynamic(
    input refcursor,
    product_filter jsonb,
    meta_json jsonb,
    sp_config jsonb DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Lead Time Constraints SP (Backend-Driven Config)

  Parameters:
    $1: input - Refcursor for result set
    $2: product_filter - JSONB with product attribute filters
    $3: meta_json - JSONB with pagination, sorting, search
    $4: sp_config - JSONB with configuration (fetched by backend)
        {
          "select_columns": "oclt.id AS id, paf.article AS article, ...",
          "paf_columns": "article, product_description, l2_name, ...",
          "paf_group_by": "1,2,3,...",
          "additional_joins": "LEFT JOIN global.user_master um ON...",
          "additional_filters": "AND oclt.is_active = true",
          "query_replacements": {"article": "oclt.article"}
        }

  Usage:
    SELECT * FROM oms.get_oms_constraints_lead_time_dynamic(
      'my_cur',
      '{"l0_name": [{"type": "list","operator": "in", "values": ["SHOES"]}]}',
      '{"limit": {"limit": 10, "page": 1}}',
      '{"select_columns": "...", "paf_columns": "...", ...}'
    );
    FETCH ALL IN "my_cur";

  Returns: Generated SQL query text
*/
DECLARE
    v_select_columns TEXT := '';
    v_paf_columns TEXT := '';
    v_paf_group_by TEXT := '';
    v_additional_joins TEXT := '';
    v_additional_filters TEXT := '';
    v_query_replacements JSONB;
    v_constraints_leadtime_sql TEXT := '';
    _query_pa TEXT;
    _query_order TEXT;
    _key TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
    v_paf_join_condition TEXT;
    v_paf_filter TEXT;
	--user_config based variables
	v_user_set_config JSONB;
    v_selected_view_level TEXT;
    v_divisor NUMERIC := 1;
    v_lead_time_columns TEXT[];
	v_total_lead_time_col TEXT;
    v_col TEXT;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- Extract configuration components
    v_select_columns := sp_config->>'select_columns';
    v_paf_columns := sp_config->>'paf_columns';
    v_paf_group_by := sp_config->>'paf_group_by';
    v_additional_joins := COALESCE(sp_config->>'additional_joins', '');
    v_additional_filters := COALESCE(sp_config->>'additional_filters', '');
    v_query_replacements := sp_config->'query_replacement';

    -- Validate required fields
    IF v_select_columns IS NULL OR v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    IF v_paf_columns IS NULL OR v_paf_columns = '' THEN
        RAISE WARNING 'No PAF columns configured, using article as default';
        v_paf_columns := 'article';
        v_paf_group_by := '1';
    ELSIF v_paf_group_by IS NULL OR v_paf_group_by = '' THEN
        RAISE EXCEPTION 'paf_group_by is required when paf_columns is provided';
    END IF;

    RAISE NOTICE 'Using backend-provided configuration (select columns: % chars, paf columns: % chars)', 
        LENGTH(v_select_columns), LENGTH(v_paf_columns);

    _query_pa := oms.form_main_table_filters('ph_master', product_filter);
    RAISE DEBUG 'Product filter query: %', _query_pa;

    _query_order := global.form_table_query(meta_json);
    RAISE DEBUG 'Order/pagination query: %', _query_order;

    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements)
        LOOP
            _query_order := REPLACE(_query_order, _key, v_query_replacements->>_key);
            RAISE DEBUG 'Applied replacement: % -> %', _key, v_query_replacements->>_key;
        END LOOP;
    END IF;

	----- Get the user_config----
	v_user_set_config := COALESCE(sp_config->'user_set_config', '{}'::jsonb);
    
    -- Extract first element of lead_time_selected_view_level array
    v_selected_view_level := COALESCE(
        v_user_set_config->'lead_time_default_selected_view'->>0, 
        'day'
    );
    -- Set divisor based on view level
    v_divisor := CASE v_selected_view_level
        WHEN 'week' THEN 7
        WHEN 'month' THEN 30
        WHEN 'year' THEN 365
        WHEN 'quater' THEN 90
        WHEN 'biweek' THEN 14
        WHEN 'halfyear' THEN 180
        ELSE 1  -- 'day'
    END;
    
    RAISE NOTICE 'View level: %, Divisor: %', v_selected_view_level, v_divisor;
    -- Apply conversion if not 'day'
    IF v_divisor > 1 THEN
        -- Get lead time sub-level columns from config (or use defaults)
        v_lead_time_columns := ARRAY(
            SELECT jsonb_array_elements_text(
                COALESCE(v_user_set_config->'lead_time_sub_level', 
                '["manufacturing_lead_time", "shipping_lead_time", "qc_lead_time"]'::jsonb)
            )
        );
        v_total_lead_time_col := v_user_set_config->'lead_time_total_lead_time_key'->>0;
        IF v_total_lead_time_col IS NOT NULL THEN
            v_lead_time_columns := array_append(v_lead_time_columns, v_total_lead_time_col);
        END IF;
        -- Replace each column in select_columns
        FOREACH v_col IN ARRAY v_lead_time_columns
        LOOP
            v_select_columns := regexp_replace(
			    v_select_columns,
			    'oclt\.' || v_col || '\s+as\s+' || v_col,
			    'COALESCE(TRUNC(oclt.' || v_col || ' / ' || v_divisor || '.0), 0)::int as ' || v_col,
			    'gi'  -- global, case-insensitive
			);
        END LOOP;
        
        RAISE NOTICE 'Converted % lead time columns to %s and ', 
            array_length(v_lead_time_columns, 1), v_selected_view_level;
    END IF;
    -- Get table schema from config (defaults to 'oms' if not specified)
    v_paf_join_condition := COALESCE(sp_config->>'paf_join_condition', 'oclt.article = paf.article');
    v_paf_filter := COALESCE(sp_config->>'paf_filter', 'AND active = true');

    -- Clean up literal \n from select_columns
	v_select_columns := REPLACE(v_select_columns, E'\\n', ' ');
	v_paf_columns := REPLACE(v_paf_columns, E'\\n', ' ');

    v_constraints_leadtime_sql := '
    SELECT
      ' || v_select_columns || '
    FROM oms.oms_constraints_lead_time oclt' || 
    ' LEFT JOIN global.user_master um ON oclt.updated_by = um.user_code' ||
    ' LEFT JOIN global.user_master um2 ON oclt.created_by = um2.user_code' ||
    v_additional_joins || '
    INNER JOIN (
      SELECT 
        ' || v_paf_columns || '
      FROM global.product_attributes_filter ' || _query_pa || ' ' || v_paf_filter || '
      GROUP BY ' || v_paf_group_by || '
    ) paf ON ' || v_paf_join_condition ||
    CASE WHEN v_additional_filters != '' THEN '
    WHERE 1=1' || v_additional_filters ELSE '' END ||
    '
    ' || _query_order;

	RAISE NOTICE 'my query: %', v_constraints_leadtime_sql;
    -- Log the generated SQL for debugging
    RAISE NOTICE 'Generated SQL (length: % chars)', LENGTH(v_constraints_leadtime_sql);
    RAISE DEBUG 'Full SQL: %', v_constraints_leadtime_sql;

    BEGIN
        OPEN input FOR EXECUTE v_constraints_leadtime_sql;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)', 
                v_error_message, SQLSTATE;
    END;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.get_oms_constraints_lead_time_dynamic', 
        'Execution completed',
        v_constraints_leadtime_sql,
        jsonb_build_object(
            'product_filter', product_filter, 
            'meta_json', meta_json,
            'config_provided', sp_config IS NOT NULL
        )
    );

    -- Return the SQL for logging/debugging
    RETURN v_constraints_leadtime_sql;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.get_oms_constraints_lead_time_dynamic', 
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
