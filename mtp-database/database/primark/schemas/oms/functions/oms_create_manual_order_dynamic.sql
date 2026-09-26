--liquibase formatted sql
--changeset piyush.raj:oms_create_manual_order_dynamic_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-dynamic-sp labels:oms_create_manual_order_dynamic
--comment: Dynamic configuration-driven SP for manual order creation - backend provides config as JSONB parameter

DROP FUNCTION IF EXISTS oms.oms_create_manual_order_dynamic(jsonb, int4, jsonb);

CREATE OR REPLACE FUNCTION oms.oms_create_manual_order_dynamic(
    order_data jsonb,
    user_id integer,
    sp_config jsonb DEFAULT NULL
)
RETURNS TABLE(
    id bigint,
    product_code character varying,
    loc_code character varying,
    vendor_code character varying,
    rop date
)
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Manual Order Creation SP (Backend-Driven Config)

  Configuration Source: Backend reads from oms.oms_sp_config_insert_columns table
                        (joined via config_id from oms.oms_sp_config_master)

  Parameters:
    $1: order_data - JSONB with order data including 'new_orders' array and optional 'order_batch_name'
    $2: user_id - Integer user ID for audit fields
    $3: sp_config - JSONB with configuration (assembled by backend from oms_sp_config_insert_columns)
        {
          "insert_columns": "order_gen_type, product_code, vendor_code, ...",
          "select_expressions": "'Manual', (o->>'product_code')::TEXT, (o->>'vendor')::TEXT, ..."
        }

        The backend builds insert_columns and select_expressions by reading rows from
        oms.oms_sp_config_insert_columns WHERE config_id = <this SP's config_id>
        AND is_active = true ORDER BY column_order, then:
          - insert_columns = comma-joined insert_column_name values
          - select_expressions = comma-joined select_expression values

        Note: In select_expressions, use $1 for order_data and $2 for user_id
              since the dynamic SQL is executed with EXECUTE...USING order_data, user_id.
              The alias 'o' refers to each element from jsonb_array_elements($1->'new_orders').

  Usage:
    SELECT * FROM oms.oms_create_manual_order_dynamic(
      '{"new_orders": [...], "order_batch_name": "batch1"}'::jsonb,
      123,
      '{"insert_columns": "order_gen_type, product_code, ...", "select_expressions": "''Manual'', ..."}'::jsonb
    );

  Returns: TABLE(id bigint, product_code varchar, loc_code varchar, vendor_code varchar, rop date)
*/
DECLARE
    v_insert_columns TEXT;
    v_select_expressions TEXT;
    v_insert_sql TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend from oms_sp_config_insert_columns)';
    END IF;

    -- Extract configuration components
    v_insert_columns := sp_config->>'insert_columns';
    v_select_expressions := sp_config->>'select_expressions';

    -- Validate required fields
    IF v_insert_columns IS NULL OR v_insert_columns = '' THEN
        RAISE EXCEPTION 'insert_columns is required in sp_config';
    END IF;

    IF v_select_expressions IS NULL OR v_select_expressions = '' THEN
        RAISE EXCEPTION 'select_expressions is required in sp_config';
    END IF;

    RAISE NOTICE 'Using backend-provided configuration (insert_columns: % chars, select_expressions: % chars)',
        LENGTH(v_insert_columns), LENGTH(v_select_expressions);

    -- Clean up literal \n from config strings
    v_insert_columns := REPLACE(v_insert_columns, E'\\n', ' ');
    v_select_expressions := REPLACE(v_select_expressions, E'\\n', ' ');

    -- Build the dynamic INSERT...SELECT...RETURNING SQL
    v_insert_sql := '
    INSERT INTO oms.oms_orders_recommended (
        ' || v_insert_columns || '
    )
    SELECT
        ' || v_select_expressions || '
    FROM jsonb_array_elements($1->''new_orders'') AS o
    ON CONFLICT DO NOTHING
    RETURNING
        oms.oms_orders_recommended.id::bigint,
        oms.oms_orders_recommended.product_code,
        oms.oms_orders_recommended.loc_code,
        oms.oms_orders_recommended.vendor_code,
        oms.oms_orders_recommended.rop';

    RAISE NOTICE 'Generated insert SQL: %', v_insert_sql;
    RAISE NOTICE 'Generated SQL (length: % chars)', LENGTH(v_insert_sql);
    RAISE DEBUG 'Full SQL: %', v_insert_sql;

    BEGIN
        RETURN QUERY EXECUTE v_insert_sql USING order_data, user_id;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)',
                v_error_message, SQLSTATE;
    END;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid,
        'oms.oms_create_manual_order_dynamic',
        'Execution completed',
        v_insert_sql,
        jsonb_build_object(
            'user_id', user_id,
            'config_provided', sp_config IS NOT NULL,
            'new_orders_count', jsonb_array_length(order_data->'new_orders')
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;

        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid,
            'oms.oms_create_manual_order_dynamic',
            'ERROR',
            v_error_message,
            jsonb_build_object(
                'user_id', user_id,
                'sqlstate', SQLSTATE
            )
        );

        -- Re-raise with context
        RAISE EXCEPTION 'Dynamic SP failed: % (SQLSTATE: %)',
            v_error_message, SQLSTATE;
END;
$function$;
