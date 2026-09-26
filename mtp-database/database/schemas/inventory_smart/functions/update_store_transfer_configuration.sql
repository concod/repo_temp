--liquibase formatted sql
--changeset shashwat.yadav:save_store_transfer_configuration runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for save_store_transfer_configuration
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_store_transfer_configuration(text, text, text, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_store_transfer_configuration(_temp_tbl_name text, _row_update text, _excluded_rows text, _store_transfer jsonb, meta_filters jsonb, updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    update_sql text;
    where_clause text := '';
    where_conditions text := '';
	_store_transfer_value text := '';
    _query_meta_filters text;
    _row_update_array varchar[];
    _excluded_rows_array varchar[];
BEGIN
/*
Sample call:
SELECT * FROM inventory_smart.update_store_transfer_configuration(
    'temp_123212', -- temp_table
    '["585024_CA_003BD-00013234", "585024_CA_007RI-0001L"]', -- row_update
    '[]', -- excluded_rows
    'set optimisation_level = ''Style Color'', transfer_strategy = ''Mins Only'', transfer_rule_id = 12', -- store_transfer
    '{"search": [], "range": [], "query_type": "AND"}', -- meta
    251 -- updated_by
);
*/
    -- Convert JSON strings to arrays
    IF _row_update = '[]' OR _row_update IS NULL OR _row_update = '' THEN
        _row_update_array := ARRAY[]::varchar[];
    ELSE
        _row_update_array := ARRAY(SELECT jsonb_array_elements_text(_row_update::jsonb));
    END IF;
    
    IF _excluded_rows = '[]' OR _excluded_rows IS NULL OR _excluded_rows = '' THEN
        _excluded_rows_array := ARRAY[]::varchar[];
    ELSE
        _excluded_rows_array := ARRAY(SELECT jsonb_array_elements_text(_excluded_rows::jsonb));
    END IF;

    _query_meta_filters := inventory_smart.form_table_query(meta_filters);
    RAISE NOTICE '_query_meta_filters: %', _query_meta_filters;

    IF _query_meta_filters != '' THEN
        where_conditions := regexp_replace(_query_meta_filters, '^WHERE\s+', '', 'i');
    END IF;

    IF array_length(_row_update_array, 1) > 0 AND _row_update_array[1] != '' THEN
        IF where_conditions != '' THEN
            where_conditions := where_conditions || ' AND ';
        END IF;
        where_conditions := where_conditions || format('article = ANY(%L)', _row_update_array);
    END IF;

    IF array_length(_excluded_rows_array, 1) > 0 AND _excluded_rows_array[1] != '' THEN
        IF where_conditions != '' THEN
            where_conditions := where_conditions || ' AND ';
        END IF;
        where_conditions := where_conditions || format('article != ALL(%L)', _excluded_rows_array);
    END IF;

	_store_transfer_value = coalesce(_store_transfer->>'value', '');
	RAISE NOTICE '_store_transfer_value: %', _store_transfer_value;

    IF where_conditions != '' THEN
        update_sql := format('UPDATE %I %s WHERE %s',
                            _temp_tbl_name, _store_transfer_value, where_conditions);
    ELSE
        update_sql := format('UPDATE %I %s',
                            _temp_tbl_name, _store_transfer_value);
    END IF;

    RAISE NOTICE 'update_sql: %', update_sql;
    EXECUTE update_sql;

END;
$function$
;