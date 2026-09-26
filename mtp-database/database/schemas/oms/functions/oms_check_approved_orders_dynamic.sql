--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:oms_check_approved_orders_dynamic_v1 runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic configuration-driven SP for checking approved orders - backend provides config as JSONB parameter

DROP FUNCTION IF EXISTS oms.oms_check_approved_orders_dynamic(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.oms_check_approved_orders_dynamic(
    input refcursor,
    order_data jsonb,
    sp_config jsonb DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Check Approved Orders SP (Backend-Driven Config)

  Parameters:
    $1: input - Refcursor for result set
    $2: order_data - JSONB with orders array
    $3: sp_config - JSONB with configuration (built by backend from oms_sp_config_filters)
        {
          "cte_columns": "(o->>'product_code')::TEXT AS product_code, ...",
          "select_columns": "t2.product_code, t2.vendor_code, ...",
          "join_conditions": "t1.product_code = t2.product_code AND ...",
        }

  Config source (oms_sp_config_filters, config_id=82):
    - filter_type='cte_column'      : CTE extraction expressions (comma-joined → cte_columns)
    - filter_type='join_condition'   : ON clause conditions (AND-joined → join_conditions)
    Backend derives select_columns as t2.<alias> from cte_column aliases.

  Usage:
    SELECT * FROM oms.oms_check_approved_orders_dynamic(
      'my_cur',
      '{"orders": [{"product_code": "ABC", "vendor_code": "V1", "rop": "2026-01-01"}]}',
      '{"cte_columns": "...", "select_columns": "...", ...}'
    );
    FETCH ALL IN "my_cur";

  Returns: Generated SQL query text
*/
DECLARE
    v_cte_columns TEXT;
    v_select_columns TEXT;
    v_join_conditions TEXT;
    v_sql TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- Extract configuration components
    v_cte_columns := sp_config->>'cte_columns';
    v_select_columns := sp_config->>'select_columns';
    v_join_conditions := sp_config->>'join_conditions';

    -- Validate required fields
    IF v_cte_columns IS NULL OR v_cte_columns = '' THEN
        RAISE EXCEPTION 'cte_columns is required in sp_config';
    END IF;
    IF v_select_columns IS NULL OR v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;
    IF v_join_conditions IS NULL OR v_join_conditions = '' THEN
        RAISE EXCEPTION 'join_conditions is required in sp_config';
    END IF;

    -- Build dynamic SQL
    v_sql := '
    WITH tab AS (
        SELECT ' || v_cte_columns || '
        FROM jsonb_array_elements($1->''orders'') AS o
    )
    SELECT ' || v_select_columns || '
    FROM oms.oms_orders_approved t1
    INNER JOIN tab t2
    ON ' || v_join_conditions;

    RAISE NOTICE 'Generated SQL (length: % chars)', LENGTH(v_sql);
    RAISE DEBUG 'Full SQL: %', v_sql;

    BEGIN
        OPEN input FOR EXECUTE v_sql USING order_data;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)', 
                v_error_message, SQLSTATE;
    END;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.oms_check_approved_orders_dynamic', 
        'Execution completed',
        v_sql,
        jsonb_build_object(
            'config_provided', sp_config IS NOT NULL
        )
    );

    RETURN v_sql;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.oms_check_approved_orders_dynamic', 
            'ERROR',
            v_error_message,
            jsonb_build_object(
                'order_data_keys', order_data,
                'sqlstate', SQLSTATE
            )
        );
        
        RAISE EXCEPTION 'Dynamic SP failed: % (SQLSTATE: %)', 
            v_error_message, SQLSTATE;
END;
$function$
;
