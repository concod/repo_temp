--liquibase formatted sql
--changeset briscoes:oms_edit_order_details_store_sales_org_3 runOnChange:true stripComments:false splitStatements:false
--comment: Edit order details for sales_org view by list of order_ids; date applies to all ids, quantity distributed by roq_constrained or applied as ratio

DROP FUNCTION IF EXISTS inventory_smart.oms_edit_order_details_store_sales_org(jsonb, int, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_edit_order_details_store_sales_org(
    p_order_groups jsonb,
    p_user_id int,
    p_locked_order_ids jsonb DEFAULT '[]'::jsonb
)
RETURNS text[]
LANGUAGE plpgsql
AS $function$
DECLARE
    v_locked_ids int[];
    v_order_ids int[];
    v_rec jsonb;
    key_val record;
    _set_clause text;
    v_distribute_order_quantity boolean;
    v_order_quantity_total int;
    v_order_quantity_key jsonb;
    v_row record;
    updated_order_group_ids text[] := '{}';
    _query text;
    v_locked_filter text := '';
    v_ids_filter text := '';
BEGIN
    -- Parse locked order IDs
    SELECT COALESCE(array_agg(value::int), ARRAY[]::int[])
    INTO v_locked_ids
    FROM jsonb_array_elements_text(p_locked_order_ids) AS t(value);

    IF array_length(v_locked_ids, 1) > 0 THEN
        v_locked_filter := ' AND t.id NOT IN (' || array_to_string(v_locked_ids, ',') || ')';
    END IF;

    -- Iterate over order groups (each has order_ids and optional date/order_quantity)
    FOR v_row IN SELECT value FROM jsonb_array_elements(p_order_groups) AS t(value)
    LOOP
        v_rec := v_row.value->'ordergroup';

        -- Get order_ids for this group
        SELECT COALESCE(array_agg(elem::int), ARRAY[]::int[])
        INTO v_order_ids
        FROM jsonb_array_elements_text(v_rec->'order_ids') AS t(elem);

        IF v_order_ids IS NULL OR array_length(v_order_ids, 1) IS NULL THEN
            CONTINUE;
        END IF;

        v_ids_filter := ' AND t.id = ANY($1)';
        _set_clause := '';
        v_distribute_order_quantity := false;
        v_order_quantity_total := null;

        -- Build dynamic SET clause (same logic as oms_edit_order_details_store)
        FOR key_val IN SELECT * FROM jsonb_each(v_rec)
        LOOP
            IF key_val.key != 'name' AND key_val.key != 'order_ids' THEN
                IF key_val.key IN ('expected_receipt_date', 'editable_expected_receipt_date') THEN
                    _set_clause := _set_clause || key_val.key || ' = TO_DATE(''' ||
                        trim(BOTH '"' FROM key_val.value::text) || ''', ''YYYY-MM-DD''), ';
                ELSIF key_val.key = 'order_quantity' THEN
                    v_order_quantity_key := key_val.value;
                    IF v_order_quantity_key->>'value' IS NOT NULL
                       AND trim(BOTH '"' FROM v_order_quantity_key->>'value') <> ''
                       AND lower(trim(BOTH '"' FROM v_order_quantity_key->>'value')) <> 'null'
                    THEN
                        v_distribute_order_quantity := true;
                        v_order_quantity_total := (v_order_quantity_key->>'value')::int;
                    ELSE
                        _set_clause := _set_clause || key_val.key || ' = CASE ' ||
                            'WHEN roq_constrained = 0 THEN CEIL(' || coalesce((v_order_quantity_key->>'ratio')::float, 1.0) || ' * 1) ' ||
                            'ELSE CEIL(' || coalesce((v_order_quantity_key->>'ratio')::float, 1.0) || ' * roq_constrained::float) END, ';
                    END IF;
                ELSE
                    _set_clause := _set_clause || key_val.key || ' = ' || quote_literal(trim(BOTH '"' FROM key_val.value::text)) || ', ';
                END IF;
            END IF;
        END LOOP;

        _set_clause := rtrim(_set_clause, ', ');

        -- Non-quantity update: apply to all v_order_ids (excluding locked)
        IF _set_clause <> '' THEN
            _query := '
                UPDATE inventory_smart.oms_orders_recommended_store t
                SET ' || _set_clause || ',
                    order_gen_type = CASE WHEN order_gen_type != ''Manual'' THEN ''Edited'' ELSE order_gen_type END,
                    updated_at = now(),
                    updated_by = ' || p_user_id || '
                WHERE t.id = ANY($1)' || v_locked_filter;
            RAISE NOTICE 'oms_edit_order_details_store_sales_org (non-quantity), order_ids %: %', v_order_ids, _query;
            EXECUTE _query USING v_order_ids;
        END IF;

        -- Quantity distribution by roq_constrained share across the same order_ids
        IF v_distribute_order_quantity THEN
            _query := '
                WITH locked AS (
                    SELECT COALESCE(SUM(oors.order_quantity), 0) AS locked_qty
                        FROM inventory_smart.oms_orders_recommended_store oors
                        WHERE oors.id = ANY($1)
                        AND (cardinality($2) = 0 OR oors.id = ANY($2))
                ),
                order_shares AS (
                    SELECT oors.id,
                           oors.roq_constrained::float AS roq_share
                    FROM inventory_smart.oms_orders_recommended_store oors
                    WHERE oors.id = ANY($1)
                    AND NOT (cardinality($2) > 0 AND oors.id = ANY($2))
                ),
                total_shares AS (
                    SELECT SUM(roq_share) AS total_roq,
                    COUNT(*) AS total_count
                    FROM order_shares
                ),
                vals AS (
                    SELECT 
                        GREATEST($3 - l.locked_qty, 0) AS total
                    FROM locked l
                )
                UPDATE inventory_smart.oms_orders_recommended_store t
                SET order_quantity = (
                    CASE 
                    -- Case 1: normal proportional distribution
                        WHEN ts.total_roq > 0 THEN 
                            CEIL((v.total::float * os.roq_share / ts.total_roq))::int
                        
                        -- Case 2: all roq_share = 0 → equal distribution
                        ELSE 
                            CEIL((v.total::float / NULLIF(ts.total_count, 0)))::int
                    END
                        ),
                    order_gen_type = CASE WHEN t.order_gen_type != ''Manual'' THEN ''Edited'' ELSE t.order_gen_type END,
                    updated_at = now(),
                    updated_by = $4
                FROM vals v, order_shares os, total_shares ts
                WHERE t.id = os.id';
            RAISE NOTICE 'oms_edit_order_details_store_sales_org (quantity distribute), order_ids %: %', v_order_ids, _query;
            EXECUTE _query USING v_order_ids, v_locked_ids, v_order_quantity_total, p_user_id;
        END IF;

        updated_order_group_ids := array_append(updated_order_group_ids, (v_order_ids[1])::text);
    END LOOP;

    RETURN updated_order_group_ids;
END;
$function$;
