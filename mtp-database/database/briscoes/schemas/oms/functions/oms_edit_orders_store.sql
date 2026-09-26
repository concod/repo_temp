--liquibase formatted sql
--changeset nikhil.dhoot:oms_edit_orders_store_2 runOnChange:true stripComments:false splitStatements:false context:MTP-98967_1 labels:MTP-98967_1
--comment: Initial version of oms_edit_orders_store function

DROP FUNCTION IF EXISTS inventory_smart.oms_edit_orders_store(jsonb, integer);
DROP FUNCTION IF EXISTS inventory_smart.oms_edit_orders_store(jsonb, integer, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_edit_orders_store(orders jsonb, user_id integer, product_filter jsonb, store_filter jsonb)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql text := '';
    v_sa_sql text := '';
    _set_clause text := '';
    _query text := '';
    v_keys text[];
    v_key text;
    updated_ids int[] := '{}';
BEGIN

    -- Build product filter
    v_pa_sql := inventory_smart.form_main_table_filters('oors', product_filter);

    -- Build store filter
    v_sa_sql := inventory_smart.form_main_table_filters('oors', store_filter);

	raise notice '%', jsonb_array_length($1);
	-- Collect distinct keys excluding control fields
	SELECT ARRAY(
		SELECT DISTINCT key
		FROM (
			SELECT je.key
			FROM jsonb_array_elements($1) e
			CROSS JOIN LATERAL jsonb_each(e) AS je
		) s
		WHERE key NOT IN ('id', 'locked')
	) INTO v_keys;

	IF v_keys IS NULL OR array_length(v_keys, 1) IS NULL THEN
		-- Only ids/locked provided; just stamp audit fields
		_set_clause := '';
	ELSE
		FOREACH v_key IN ARRAY v_keys LOOP
			IF v_key = 'value' THEN
				_set_clause := _set_clause || 'order_quantity = COALESCE((u.data->>''value'')::int, order_quantity), ';
			ELSIF v_key = 'expected_receipt_date' OR v_key = 'editable_expected_receipt_date' THEN
				_set_clause := _set_clause || v_key || ' = COALESCE(TO_DATE(u.data->>''' || v_key || ''', ''YYYY-MM-DD''), ' || v_key || '), ';
			ELSE
				-- Generic assignment; rely on Postgres assignment cast from text where applicable
				_set_clause := _set_clause || v_key || ' = COALESCE(NULLIF(u.data->>''' || v_key || ''', ''''), ' || v_key || '), ';
			END IF;
		END LOOP;
	END IF;

	-- Trim trailing comma and space
	_set_clause := rtrim(_set_clause, ', ');

	-- Build and execute single batched update
	_query :=
		'WITH store_filter AS (
			SELECT store_code
			FROM global.store_attributes_filter
			' || v_sa_sql || '
		), u AS (
			SELECT (e->>''id'')::int AS id, e AS data
			FROM jsonb_array_elements($1) e
		)
		UPDATE inventory_smart.oms_orders_recommended_store t
		SET ' || CASE WHEN _set_clause <> '' THEN _set_clause || ', ' ELSE '' END ||
			'order_gen_type = CASE WHEN t.order_gen_type != ''Manual'' THEN ''Edited'' ELSE t.order_gen_type END,
			updated_at = now(), updated_by = ' || $2 || '
		FROM u, store_filter sf
		' || v_pa_sql || ' and t.store_code = sf.store_code and t.id = u.id and t.order_status_id NOT IN (1, 3)';

	raise notice 'Final SQL: %', _query;
	EXECUTE _query USING $1;

	-- Return updated ids
	SELECT ARRAY(SELECT (e->>'id')::int FROM jsonb_array_elements($1) e) INTO updated_ids;
	RETURN updated_ids;
END  $function$
;
