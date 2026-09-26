--liquibase formatted sql
--changeset cascade:action_oms_orders_dynamic_v1 runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic configuration-driven SP for action_oms_orders - backend provides config as JSONB parameter

DROP FUNCTION IF EXISTS oms.action_oms_orders_dynamic(jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.action_oms_orders_dynamic(
    jsonb,
    sp_config jsonb DEFAULT NULL
)
RETURNS integer[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
/*
  Dynamic Action OMS Orders SP (Backend-Driven Config)

  Parameters:
    $1: JSONB with order action data (status, action_code, orders_id, orders_group_id, comment, user_id)
    $2: sp_config - JSONB from backend (built from oms_sp_config_insert_columns + oms_sp_config_filters):
        {
          "schema_name": "oms",                          -- from oms_sp_config_filters (filter_type=config)
          "has_order_group_id": true,                     -- from oms_sp_config_filters (filter_type=config)
          "insert_columns": "id, order_gen_type, ...",    -- from oms_sp_config_insert_columns (column names joined)
          "select_columns": "oor.id, oor.order_gen_type, ...",  -- from oms_sp_config_insert_columns (expressions joined)
          "kpi_join_condition": "oor.product_code = ok.product_code AND oor.loc_code = ok.loc_code",
          "insert_where": "oor.order_quantity > 0 AND",  -- from oms_sp_config_filters (filter_type=insert_where)
          "additional_ctes": "",                          -- from oms_sp_config_filters (filter_type=additional_ctes)
          "additional_joins": ""                          -- from oms_sp_config_filters (filter_type=additional_joins)
        }

  Config source:
    - oms_sp_config_insert_columns (config_id=93): INSERT column names + SELECT expressions
      - select_expression uses $2 for v_user_id, $3 for v_comment in EXECUTE USING
    - oms_sp_config_filters (config_id=93): schema_name, has_order_group_id, kpi_join, insert_where, additional_ctes, additional_joins

  Returns: Array of affected order IDs
*/
DECLARE
    _key              text;
    _value            text;
    v_order_status_id int;
    v_action_id       int;
    v_order_id        int[];
    v_comment         text;
    v_user_id         int;
    v_affected_rows   int := 0;
    approved_ids      int[];
    v_order_group_id  varchar[];
    v_has_order_group_id text;
    v_insert_columns  text;
    v_select_columns  text;
    v_kpi_join_condition text;
    v_insert_where    text;
    v_additional_ctes text;
    v_additional_joins text;
    v_sql             text;
    v_sql_log         text := '';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    v_error_message   text;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    -- Extract configuration
    v_has_order_group_id := COALESCE((sp_config->>'has_order_group_id'), '');
    v_insert_columns := sp_config->>'insert_columns';
    v_select_columns := sp_config->>'select_columns';
    v_kpi_join_condition := COALESCE(sp_config->>'join_condition', 'oor.product_code = ok.product_code AND oor.loc_code = ok.loc_code');
    v_insert_where := COALESCE(sp_config->>'where_clause', '');
    v_additional_ctes := COALESCE(sp_config->>'additional_ctes', '');
    v_additional_joins := COALESCE(sp_config->>'additional_joins', '');

    -- Parse input JSONB
    FOR _key, _value IN SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL LOOP
        IF _key = 'status' THEN
            v_order_status_id := _value::int;
            RAISE NOTICE 'order_status_id %', v_order_status_id;
        ELSIF _key = 'action_code' THEN
            v_action_id := _value;
            RAISE NOTICE 'action_code %', v_action_id;
        ELSIF _key = 'orders_id' THEN
            v_order_id := _value::int[];
            RAISE NOTICE 'orders_id %', array_to_string(v_order_id, ',');
        ELSIF _key = 'orders_group_id' THEN
            IF v_has_order_group_id THEN
                v_order_group_id := ARRAY(SELECT value FROM jsonb_array_elements_text(_value::jsonb));
                RAISE NOTICE 'v_order_group_id %', v_order_group_id;
            END IF;
        ELSIF _key = 'comment' THEN
            v_comment := _value;
            RAISE NOTICE 'comment %', v_comment;
        ELSIF _key = 'user_id' THEN
            v_user_id := _value;
            RAISE NOTICE 'user_id %', v_user_id;
        END IF;
    END LOOP;

    IF v_order_status_id IN (1, 2, -1) THEN
        -- Update order status
        v_sql := '
            WITH t AS (
                UPDATE oms.oms_orders_recommended
                SET order_status_id = $2,
                    updated_by = $3,
                    updated_at = CURRENT_TIMESTAMP,
                    approve_by_date = CURRENT_DATE + 7
                WHERE oms_orders_recommended.id = ANY($1)
                RETURNING oms_orders_recommended.id
            )
            SELECT ARRAY_AGG(id) FROM t';

        EXECUTE v_sql INTO approved_ids USING v_order_id, v_order_status_id, v_user_id;
        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
        v_sql_log := v_sql_log || '-- Status 1/2/-1 UPDATE:' || E'\n' || v_sql || E'\n\n';

        -- Insert approval history
        v_sql := '
            INSERT INTO oms.oms_orders_approval_hist
            SELECT a.id, a.ord_id, b.action_id, b."comment", b.actioned_by, b.actioned_at
            FROM (
                SELECT nextval(''oms.oms_orders_approval_hist_id_seq'') AS id,
                       UNNEST($1) AS ord_id
            ) a
            CROSS JOIN (
                SELECT $2 AS action_id,
                       $3 AS "comment",
                       $4 AS actioned_by,
                       CURRENT_TIMESTAMP AS actioned_at
            ) b';

        EXECUTE v_sql USING v_order_id, v_action_id, v_comment, v_user_id;
        v_sql_log := v_sql_log || '-- Approval History INSERT:' || E'\n' || v_sql || E'\n\n';

    ELSIF v_order_status_id = -2 THEN
        -- Revert orders
        v_sql := '
            WITH t AS (
                UPDATE oms.oms_orders_recommended
                SET order_status_id = 1,
                    updated_by = $2,
                    is_deleted = false,
                    updated_at = CURRENT_TIMESTAMP,
                    order_placement_date = order_placement_recom_date
                WHERE oms_orders_recommended.id = ANY($1)
                ' || v_has_order_group_id || '
                RETURNING oms_orders_recommended.id
            )
            SELECT ARRAY_AGG(id) FROM t';

        EXECUTE v_sql INTO approved_ids USING v_order_id, v_user_id, v_order_group_id;
        RAISE NOTICE '%', approved_ids;
        v_sql_log := v_sql_log || '-- Status -2 UPDATE:' || E'\n' || v_sql || E'\n\n';

        EXECUTE 'DELETE FROM oms.oms_orders_approved ooa WHERE ooa.id = ANY($1)' USING approved_ids;
        v_sql_log := v_sql_log || '-- DELETE oms_orders_approved' || E'\n\n';
        EXECUTE 'DELETE FROM oms.oms_orders_approval_hist ooah WHERE ooah.order_id = ANY($1)' USING approved_ids;
        v_sql_log := v_sql_log || '-- DELETE oms_orders_approval_hist' || E'\n\n';

    ELSIF v_order_status_id = 3 THEN
        RAISE NOTICE 'start %', v_order_status_id;

        -- Build approve SQL with config-driven INSERT columns
        -- select_columns use $1=v_order_id, $2=v_user_id, $3=v_comment
        IF v_additional_ctes != '' THEN
            v_sql := 'WITH ' || v_additional_ctes || ',
            t AS (';
        ELSE
            v_sql := 'WITH t AS (';
        END IF;

        v_sql := v_sql || '
                INSERT INTO oms.oms_orders_approved
                (' || v_insert_columns || ')
                SELECT ' || v_select_columns || '
                FROM oms.oms_orders_recommended AS oor
                LEFT JOIN oms.oms_kpi AS ok
                ON ' || v_kpi_join_condition || '
                ' || v_additional_joins || '
                WHERE ' || v_insert_where || ' oor.id = ANY($1)
                ON CONFLICT DO NOTHING
                RETURNING oms_orders_approved.id
            )
            SELECT ARRAY_AGG(id) FROM t';

        EXECUTE v_sql INTO approved_ids USING v_order_id, v_user_id, v_comment;
        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
        v_sql_log := v_sql_log || '-- Status 3 INSERT INTO oms_orders_approved:' || E'\n' || v_sql || E'\n\n';

        IF v_affected_rows > 0 THEN
            EXECUTE '
                UPDATE oms.oms_orders_recommended
                SET is_deleted = TRUE,
                    order_placement_date = CURRENT_DATE,
                    order_status_id = 3
                WHERE oms_orders_recommended.id = ANY($1)' USING approved_ids;
            v_sql_log := v_sql_log || '-- Status 3 UPDATE oms_orders_recommended (is_deleted=TRUE):' || E'\n\n';
        END IF;

        -- Insert approval history
        v_sql := '
            INSERT INTO oms.oms_orders_approval_hist
            SELECT a.id, a.ord_id, b.action_id, b."comment", b.actioned_by, b.actioned_at
            FROM (
                SELECT nextval(''oms.oms_orders_approval_hist_id_seq'') AS id,
                       UNNEST($1) AS ord_id
            ) a
            CROSS JOIN (
                SELECT $2 AS action_id,
                       $3 AS "comment",
                       $4 AS actioned_by,
                       CURRENT_TIMESTAMP AS actioned_at
            ) b';

        EXECUTE v_sql USING approved_ids, v_action_id, v_comment, v_user_id;
        v_sql_log := v_sql_log || '-- Approval History INSERT:' || E'\n' || v_sql || E'\n\n';
    END IF;

    -- Log execution for audit trail
    PERFORM global.sp_log(
        v_gen_random_uuid,
        'oms.action_oms_orders_dynamic',
        'Execution completed',
        v_sql_log,
        jsonb_build_object(
            'config_provided', sp_config IS NOT NULL,
            'order_status_id', v_order_status_id
        )
    );

    RETURN approved_ids;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;

        -- Log error
        PERFORM global.sp_log(
            v_gen_random_uuid,
            'oms.action_oms_orders_dynamic',
            'ERROR',
            v_error_message,
            jsonb_build_object(
                'order_status_id', v_order_status_id,
                'sqlstate', SQLSTATE
            )
        );

        RAISE EXCEPTION 'Dynamic SP failed: % (SQLSTATE: %)', v_error_message, SQLSTATE;
END;
$function$;
