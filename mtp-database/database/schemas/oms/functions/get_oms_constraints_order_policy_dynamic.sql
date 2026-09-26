--liquibase formatted sql
--changeset oms_team@impactanalytics.co:oms_get_oms_constraints_order_policy_dynamic_v5 runOnChange:true stripComments:false splitStatements:false
--comment: Order policy dynamic SP; optional columns use sp_config.user_set_config (same pattern as get_oms_constraints_safety_stock_dynamic)
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_constraints_order_policy_dynamic(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_constraints_order_policy_dynamic(
    input refcursor,
    product_filter jsonb,
    meta_json jsonb,
    sp_config jsonb DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Order Policy Constraints SP (Backend-Driven Config)

  Parameters:
    $1: input - Refcursor for result set
    $2: product_filter - JSONB with product attribute filters
    $3: meta_json - JSONB with pagination, sorting, search
    $4: sp_config - JSONB with configuration (fetched by backend)
        {
          "select_columns": "ovdlt.article, ovdlt.loc_code, ...",
          "additional_joins": "LEFT JOIN oms.oms_pack_config opc ON ovdlt.article = opc.article",
          "additional_filters": "",
          "query_replacements": {"article": "ovdlt.article"},
          "outer_query_replacements": {"article": "temp.article"},
          "paf_join_condition": "ovdlt.article = paf.article",
          "paf_filter": "",
          "user_set_config": {
            "is_pack_config_visible": ["true"],
            "is_auto_approve_visible": ["true"]
          }
        }
        user_set_config is merged from oms.oms_sp_update_config for this SP config_id
        (see SPConfigManager.build_sp_config_json), same shape as safety stock dynamic SP.
        When a flag is false, the matching projected column is removed from select_columns.
        Missing keys default to visible (true).

  Usage:
    SELECT * FROM oms.get_oms_constraints_order_policy_dynamic(
      'my_cur',
      '{"l2_name": [{"type": "list","operator": "in", "values": ["Category1"]}]}',
      '{"limit": {"limit": 10, "page": 1}}',
      '{"select_columns": "...", ...}'
    );
    FETCH ALL IN "my_cur";

  Returns: Generated SQL query text
*/
DECLARE
    v_select_columns TEXT := '';
    v_additional_joins TEXT := '';
    v_additional_filters TEXT := '';
    v_query_replacements JSONB;
    v_outer_query_replacements JSONB;
    v_paf_join_condition TEXT;
    v_paf_filter TEXT;
    v_order_policy_sql TEXT := '';
    _query_pa TEXT;
    _query_meta TEXT;
    _key TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::varchar;
    v_error_message TEXT;
    v_user_set_config JSONB;
    v_show_pack_config BOOLEAN;
    v_show_auto_approve BOOLEAN;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- Extract configuration components
    v_select_columns := sp_config->>'select_columns';
    v_additional_joins := COALESCE(sp_config->>'additional_joins', '');
    v_additional_filters := COALESCE(sp_config->>'additional_filters', '');
    v_query_replacements := sp_config->'query_replacements';
    v_outer_query_replacements := sp_config->'outer_query_replacements';
    v_paf_join_condition := COALESCE(sp_config->>'paf_join_condition', 'ovdlt.article = paf.article');
    v_paf_filter := COALESCE(sp_config->>'paf_filter', '');

    -- Validate required fields
    IF v_select_columns IS NULL OR v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    RAISE NOTICE 'Using backend-provided configuration (select columns: % chars)', 
        LENGTH(v_select_columns);

    -- Generate product filter query
    _query_pa := oms.form_main_table_filters('ph_master', product_filter);
    RAISE DEBUG 'Product filter query: %', _query_pa;

    -- Generate order/pagination query for meta filters
    _query_meta := '';
    IF meta_json <> '{}'::jsonb THEN
        _query_meta := global.form_table_query(meta_json);
        _query_meta := REPLACE(_query_meta, 'WHERE', 'and');
    END IF;
    RAISE DEBUG 'Meta query: %', _query_meta;

    -- Apply query replacements to product filter query (inside subquery)
    IF v_query_replacements IS NOT NULL AND jsonb_typeof(v_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_query_replacements)
        LOOP
            IF position(_key in _query_pa) > 0 THEN
                _query_pa := regexp_replace(_query_pa, '\y' || _key || '\y', v_query_replacements->>_key, 'g');
            END IF;
            RAISE DEBUG 'Applied inner replacement: % -> %', _key, v_query_replacements->>_key;
        END LOOP;
    END IF;

    -- Apply outer query replacements to meta filter query (outside subquery)
    IF v_outer_query_replacements IS NOT NULL AND jsonb_typeof(v_outer_query_replacements) = 'object' THEN
        FOR _key IN SELECT * FROM jsonb_object_keys(v_outer_query_replacements)
        LOOP
            IF position(_key in _query_meta) > 0 THEN
                _query_meta := regexp_replace(_query_meta, '\y' || _key || '\y', v_outer_query_replacements->>_key, 'g');
            END IF;
            RAISE DEBUG 'Applied outer replacement: % -> %', _key, v_outer_query_replacements->>_key;
        END LOOP;
    END IF;

    -- Clean up literal \n from columns
    v_select_columns := REPLACE(v_select_columns, E'\\n', ' ');
    
    -- Fix escaped single quotes from JSONB
    v_select_columns := regexp_replace(v_select_columns, E'\\\\+\'', '''', 'g');
    v_additional_filters := regexp_replace(v_additional_filters, E'\\\\+\'', '''', 'g');
    v_paf_filter := regexp_replace(v_paf_filter, E'\\\\+\'', '''', 'g');

    -- Optional columns: same pattern as get_oms_constraints_safety_stock_dynamic (user_set_config on sp_config)
    v_user_set_config := COALESCE(sp_config->'user_set_config', '{}'::jsonb);
    v_show_pack_config := COALESCE(
        (v_user_set_config->'is_pack_config_visible'->>0)::boolean,
        TRUE
    );
    v_show_auto_approve := COALESCE(
        (v_user_set_config->'is_auto_approve_visible'->>0)::boolean,
        TRUE
    );
    RAISE NOTICE 'Order policy column visibility: pack_config=%, auto_approve=%',
        v_show_pack_config, v_show_auto_approve;

    IF NOT v_show_pack_config THEN
        v_select_columns := regexp_replace(
            v_select_columns,
            E',\\s*CASE WHEN opc\\.size IS NULL THEN false ELSE true END as pack_config',
            '',
            'gi'
        );
    END IF;
    IF NOT v_show_auto_approve THEN
        v_select_columns := regexp_replace(
            v_select_columns,
            E',\\s*ovdlt\\.auto_approve as auto_approve',
            '',
            'gi'
        );
    END IF;
    v_select_columns := regexp_replace(v_select_columns, E',\\s*,+\\s*', ', ', 'g');

    -- Build the dynamic SQL (matching primark structure with row_number)
    v_order_policy_sql := '
    select * 
    from (
        SELECT 
            row_number() OVER (PARTITION BY (ovdlt.article) ORDER BY ovdlt.article DESC) position,
            ' || v_select_columns || '
        FROM oms.oms_constraints_order_policy ovdlt
        LEFT JOIN "global".product_attributes_filter paf 
            ON ' || v_paf_join_condition || '
        LEFT JOIN global.user_master u ON u.user_code = ovdlt.created_by
        LEFT JOIN global.user_master u1 ON u1.user_code = ovdlt.updated_by::int' ||
        CASE WHEN v_additional_joins != '' THEN '
        ' || v_additional_joins ELSE '' END ||
        _query_pa ||
        CASE WHEN v_paf_filter != '' THEN ' ' || v_paf_filter ELSE '' END ||
        CASE WHEN v_additional_filters != '' THEN ' ' || v_additional_filters ELSE '' END || '
    ) temp 
    where position = 1' || _query_meta;

    RAISE NOTICE 'v_order_policy_sql %', v_order_policy_sql;

    BEGIN
        OPEN input FOR EXECUTE v_order_policy_sql;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RAISE EXCEPTION 'Error executing dynamic SQL: % (SQLSTATE: %)', 
                v_error_message, SQLSTATE;
    END;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'oms.get_oms_constraints_order_policy_dynamic', 
        'Execution completed',
        v_order_policy_sql,
        jsonb_build_object(
            'product_filter', product_filter, 
            'meta_json', meta_json,
            'config_provided', sp_config IS NOT NULL
        )
    );

    -- Return the SQL for logging/debugging
    RETURN v_order_policy_sql;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        
        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid, 
            'oms.get_oms_constraints_order_policy_dynamic', 
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
