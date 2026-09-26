--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oms_shipment_list_constraint_dynamic_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-127833 labels:oms_shipment_list_constraint_dynamic
--comment: Dynamic configuration-driven SP for shipment constraint listing - backend provides config as JSONB parameter

DROP FUNCTION IF EXISTS oms.oms_shipment_list_constraint_dynamic(refcursor, jsonb, text[], jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.oms_shipment_list_constraint_dynamic(
    input refcursor,
    product_filter jsonb,
    meta_json jsonb,
    sp_config jsonb DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Shipment Constraint Listing SP (Backend-Driven Config)

  Parameters:
    $1: input - Refcursor for result set
    $2: product_filter - JSONB with product attribute filters
    $3: meta_json - JSONB with pagination, sorting, search
    $4: sp_config - JSONB with configuration (fetched by backend)
        {
          "select_columns": "ocs.id AS shipment_id, paf.article AS article, ...",
          "paf_columns": "article, product_code, size, ...",
          "paf_group_by": "1,2,3,...",
          "paf_join_condition": "ocs.product_code = paf.product_code",
          "paf_filter": "AND active = true",
          "additional_joins": "",
          "additional_filters": "",
          "query_replacements": {"article": "paf.article"}
        }

  Usage:
    SELECT * FROM oms.oms_shipment_list_constraint_dynamic(
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
    v_paf_join_condition TEXT := '';
    v_paf_filter TEXT := '';
    v_additional_joins TEXT := '';
    v_additional_filters TEXT := '';
    v_query_replacements JSONB;
    v_shipment_constraint_sql TEXT := '';
    _query_pa TEXT;
    _query_order TEXT;
    _key TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- Extract configuration components
    v_select_columns := sp_config->>'select_columns';
    v_paf_columns := sp_config->>'paf_columns';
    v_paf_group_by := sp_config->>'paf_group_by';
    v_paf_join_condition := COALESCE(sp_config->>'paf_join_condition', 'ocs.product_code = paf.product_code');
    v_paf_filter := COALESCE(sp_config->>'paf_filter', '');
    v_additional_joins := COALESCE(sp_config->>'additional_joins', '');
    v_additional_filters := COALESCE(sp_config->>'additional_filters', '');
    v_query_replacements := sp_config->'query_replacements';
    -- Validate required fields
    IF v_select_columns IS NULL OR v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    IF v_paf_columns IS NULL OR v_paf_columns = '' THEN
        RAISE WARNING 'No PAF columns configured, using product_code as default';
        v_paf_columns := 'product_code';
        v_paf_group_by := '1';
    ELSIF v_paf_group_by IS NULL OR v_paf_group_by = '' THEN
        RAISE EXCEPTION 'paf_group_by is required when paf_columns is provided';
    END IF;

    RAISE NOTICE 'Using backend-provided configuration (select columns: % chars, paf columns: % chars)', 
        LENGTH(v_select_columns), LENGTH(v_paf_columns);

    -- Form product attribute filter query
    _query_pa := global.form_main_table_filters('product_attributes_filter', product_filter);
    RAISE DEBUG 'Product filter query: %', _query_pa;

    -- Form order and pagination query
    _query_order := global.form_table_query(meta_json);
    RAISE DEBUG 'Order/pagination query: %', _query_order;

    -- Apply query replacements if provided
    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements)
        LOOP
            _query_order := REPLACE(_query_order, _key, v_query_replacements->>_key);
            RAISE DEBUG 'Applied replacement: % -> %', _key, v_query_replacements->>_key;
        END LOOP;
    END IF;

    -- Clean up literal \n from select_columns and paf_columns
    v_select_columns := REPLACE(v_select_columns, E'\\n', ' ');
    v_paf_columns := REPLACE(v_paf_columns, E'\\n', ' ');

    -- Build the main SQL query
    v_shipment_constraint_sql := '
    SELECT
      ' || v_select_columns || '
    FROM oms.oms_constraints_shipment ocs' || 
    v_additional_joins || '
    INNER JOIN (
      SELECT 
        ' || v_paf_columns || '
      FROM global.product_attributes_filter ' || _query_pa || 
      CASE WHEN v_paf_filter != '' THEN ' ' || v_paf_filter ELSE '' END || '
      GROUP BY ' || v_paf_group_by || '
    ) paf ON ' || v_paf_join_condition ||
    CASE WHEN v_additional_filters != '' THEN '
    WHERE 1=1 ' || v_additional_filters ELSE '' END ||
    '
    ' || _query_order;

    RAISE NOTICE 'Generated shipment constraint SQL: %', v_shipment_constraint_sql;
    
    -- Log the generated SQL for debugging
    RAISE NOTICE 'Generated SQL (length: % chars)', LENGTH(v_shipment_constraint_sql);
    RAISE DEBUG 'Full SQL: %', v_shipment_constraint_sql;

    BEGIN
        OPEN input FOR EXECUTE v_shipment_constraint_sql;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)', 
                v_error_message, SQLSTATE;
    END;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.oms_shipment_list_constraint_dynamic', 
        'Execution completed',
        v_shipment_constraint_sql,
        jsonb_build_object(
            'product_filter', product_filter, 
            'meta_json', meta_json,
            'config_provided', sp_config IS NOT NULL
        )
    );

    -- Return the SQL for logging/debugging
    RETURN v_shipment_constraint_sql;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.oms_shipment_list_constraint_dynamic', 
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
