--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oms_get_oms_constraints_status_dynamic_v3 runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic configuration-driven SP - backend provides config as JSONB parameter
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_constraints_status_dynamic(refcursor, jsonb, jsonb, jsonb);
-- DROP FUNCTION oms.get_oms_constraints_status_dynamic(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_constraints_status_dynamic(input refcursor, product_filter jsonb, meta_json jsonb, sp_config jsonb DEFAULT NULL::jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
  Dynamic Constraints Status SP (Backend-Driven Config)
  
  Parameters:
    $1: input - Refcursor for result set
    $2: product_filter - JSONB with product attribute filters
    $3: meta_json - JSONB with pagination, sorting, search
    $4: sp_config - JSONB with configuration (fetched by backend)
        {
          "select_columns": "ocs.id AS id, paf.article AS article, ...",
          "paf_columns": "article, product_description, l2_name, ...",
          "paf_group_by": "1,2,3,...",
          "paf_filter": "AND active = true",
          "paf_join_condition": "ocs.product_code = paf.product_code",
          "additional_joins": "LEFT JOIN global.user_master um ON...",
          "additional_filters": "AND ocs.is_active = true",
          "query_replacements": {"article": "paf.article"},
          "select_distinct": false
        }
  
  Usage:
    SELECT * FROM oms.get_oms_constraints_status_dynamic(
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
    v_select_group_by TEXT := '';
    v_additional_join TEXT := '';
    v_additional_filters TEXT := '';
    v_query_replacements JSONB;
    v_paf_join_condition TEXT := 'ocs.product_code = paf.product_code';
    v_paf_filter TEXT := '';
    v_select_distinct TEXT := '';
    v_constraints_status_sql TEXT := '';
    _query_pa TEXT;
    _query_order TEXT;
    _key TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
    v_modified_product_filter JSONB;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- Extract configuration components
    v_select_columns := sp_config->>'select_columns';
    v_paf_columns := sp_config->>'paf_columns';
    v_select_group_by := sp_config->>'select_group_by';
    v_additional_join := COALESCE(sp_config->>'additional_join', '');
    v_additional_filters := COALESCE(sp_config->>'additional_filters', '');
    v_query_replacements := sp_config->'query_replacement';
    v_paf_join_condition := COALESCE(sp_config->>'paf_join_condition', 'ocs.product_code = paf.product_code');
    v_paf_filter := COALESCE(sp_config->>'paf_filter', '');
    
    -- Handle DISTINCT in SELECT
    IF (sp_config->>'select_distinct')::boolean IS TRUE THEN
        v_select_distinct := 'DISTINCT ';
    END IF;

    -- Validate required fields
    IF v_select_columns IS NULL OR v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    IF v_paf_columns IS NULL OR v_paf_columns = '' THEN
        RAISE WARNING 'No PAF columns configured, using product_code as default';
        v_paf_columns := 'product_code';
        v_select_group_by := '1';
    ELSIF v_select_group_by IS NULL OR v_select_group_by = '' THEN
        RAISE EXCEPTION 'paf_group_by is required when paf_columns is provided';
    END IF;

    -- Handle product filter modifications (e.g., Carters adds active_ladder_flg)
    v_modified_product_filter := product_filter;
    IF sp_config->'product_filter_additions' IS NOT NULL THEN
        v_modified_product_filter := v_modified_product_filter || (sp_config->'product_filter_additions');
        RAISE NOTICE 'Added product filter: %', sp_config->'product_filter_additions';
    END IF;

    -- Generate product filter query
    _query_pa := oms.form_main_table_filters('ph_master', v_modified_product_filter);

    RAISE DEBUG 'Product filter query: %', _query_pa;

    -- Apply query replacements to product filter query
    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements)
        LOOP
            _query_pa := REPLACE(_query_pa, _key, v_query_replacements->>_key);
            RAISE DEBUG 'Applied replacement to PA: % -> %', _key, v_query_replacements->>_key;
        END LOOP;
    END IF;

    -- Generate order/pagination query
    _query_order := global.form_table_query(meta_json);
    RAISE DEBUG 'Order/pagination query: %', _query_order;

    -- Apply query replacements to order query
    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements)
        LOOP
            _query_order := REPLACE(_query_order, _key, v_query_replacements->>_key);
            RAISE DEBUG 'Applied replacement to order: % -> %', _key, v_query_replacements->>_key;
        END LOOP;
    END IF;

    -- Clean up literal \n from columns
    v_select_columns := REPLACE(v_select_columns, E'\\n', ' ');
    v_paf_columns := REPLACE(v_paf_columns, E'\\n', ' ');

    -- Build the dynamic SQL
    v_constraints_status_sql := '
    SELECT *
    FROM (
      SELECT ' || v_select_distinct || '
        ' || v_select_columns || '
      FROM oms.oms_constraints_status ocs
      INNER JOIN
        global.product_attributes_filter paf
      ON
        ' || v_paf_join_condition || 
        CASE WHEN v_paf_filter != '' THEN '
      ' || v_paf_filter ELSE '' END || '
      LEFT JOIN global.user_master umc ON ocs.created_by = umc.user_code
      LEFT JOIN global.user_master umu ON ocs.updated_by = umu.user_code ' ||
      v_additional_join || 
      _query_pa ||
      CASE WHEN v_additional_filters != '' THEN '
      ' || v_additional_filters ELSE '' END || '
      GROUP BY ' || v_select_group_by || '
    ) X ' || _query_order;

    -- Log the generated SQL for debugging
    RAISE NOTICE 'Generated SQL (length: % chars)', LENGTH(v_constraints_status_sql);
    RAISE DEBUG 'Full SQL: %', v_constraints_status_sql;

    BEGIN
        OPEN input FOR EXECUTE v_constraints_status_sql;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)', 
                v_error_message, SQLSTATE;
    END;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.get_oms_constraints_status_dynamic', 
        'Execution completed',
        v_constraints_status_sql,
        jsonb_build_object(
            'product_filter', product_filter, 
            'meta_json', meta_json,
            'config_provided', sp_config IS NOT NULL
        )
    );

    -- Return the SQL for logging/debugging
    RETURN v_constraints_status_sql;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.get_oms_constraints_status_dynamic', 
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