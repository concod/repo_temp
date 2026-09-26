--liquibase formatted sql
--changeset priyansh.gautam:oms_edit_order_details_store_11 runOnChange:true stripComments:false splitStatements:false context:MTP-129953 labels:MTP-98967_2
--comment: performance_optimisation__single_pass_based_update

DROP FUNCTION IF EXISTS inventory_smart.oms_edit_order_details_store(jsonb, int, int[]);
DROP FUNCTION IF EXISTS inventory_smart.oms_edit_order_details_store(jsonb, int, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_edit_order_details_store(jsonb, int, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_edit_order_details_store(jsonb, int, jsonb, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_edit_order_details_store(
    p_order_groups jsonb,
    p_user_id int,
    p_fiscal_weeks jsonb,
    p_product_filter jsonb,
    p_store_filter jsonb,
    p_locked_order_ids jsonb
)
RETURNS text[]
LANGUAGE plpgsql
AS $function$
DECLARE
    v_fiscal_weeks int[];
    v_locked_ids int[];
    v_pa_sql text;
    v_sa_sql text;
    v_locked_filter text := '';
    v_order_group_id text;
    v_rec jsonb;
    key_val record;
    _set_clause text;
    v_distribute_order_quantity boolean;
    v_order_quantity_total int;
    v_order_quantity_key jsonb;
    v_row record;
    updated_order_group_ids text[] := '{}';
    _query text;
BEGIN
    -- Parse fiscal weeks
    SELECT array_agg(value::int)
    INTO v_fiscal_weeks
    FROM jsonb_array_elements_text(p_fiscal_weeks) AS t(value);

    -- Parse locked order IDs
    SELECT array_agg(value::int)
    INTO v_locked_ids
    FROM jsonb_array_elements_text(p_locked_order_ids) AS t(value);

    -- Locked orders filter
    IF array_length(v_locked_ids,1) > 0 THEN
        v_locked_filter := ' AND oors.id NOT IN (' || array_to_string(v_locked_ids,',') || ')';
    END IF;

    -- Build filters
    v_pa_sql := COALESCE(regexp_replace(COALESCE(inventory_smart.form_main_table_filters('oors', p_product_filter),''),'^\s*where\s+',' AND ','i'),'');
    v_sa_sql := COALESCE(regexp_replace(COALESCE(inventory_smart.form_main_table_filters('oors', p_store_filter),''),'^\s*where\s+',' AND ','i'),''); 

    -- Iterate over order groups
    FOR v_row IN SELECT value FROM jsonb_array_elements(p_order_groups) AS t(value)
    LOOP
        v_rec := v_row.value->'ordergroup';
        v_order_group_id := v_rec->>'name';
        _set_clause := '';
        v_distribute_order_quantity := false;
        v_order_quantity_total := null;

        -- Build dynamic SET clause
        FOR key_val IN SELECT * FROM jsonb_each(v_rec)
        LOOP
            IF key_val.key != 'name' THEN
                IF key_val.key IN ('expected_receipt_date','editable_expected_receipt_date') THEN
                    _set_clause := _set_clause || key_val.key || ' = TO_DATE(''' ||
                        trim(BOTH '"' FROM key_val.value::text) || ''',''YYYY-MM-DD''), ';
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
                            'WHEN (SELECT total_roq_unconstrained FROM totals) = 0 THEN CEIL(COALESCE((' || (v_order_quantity_key->>'ratio') || ')::float, 1.0) * COALESCE(roq_constrained, 1)) ' ||
                            'ELSE CEIL(COALESCE((' || (v_order_quantity_key->>'ratio') || ')::float, 0) * roq_constrained::float) END, ';
                    END IF;
                ELSE
                    _set_clause := _set_clause || key_val.key || ' = ' || quote_literal(trim(BOTH '"' FROM key_val.value::text)) || ', ';
                END IF;
            END IF;
        END LOOP;

        _set_clause := rtrim(_set_clause,', ');

        -- Non-quantity field update (totals CTE: only coalesce roq_constrained to 1 when total roq_unconstrained = 0)
        _query := 'WITH store_filter AS (
                        SELECT store_code
                        FROM global.store_attributes_filter sf
                        WHERE 1=1 ' || v_sa_sql || '
                    ),
                    totals AS (
                        SELECT COALESCE(SUM(oors.roq_unconstrained), 0)::float AS total_roq_unconstrained
                        FROM inventory_smart.oms_orders_recommended_store oors
                        JOIN store_filter sf ON oors.store_code = sf.store_code
                        WHERE 1=1 ' || v_pa_sql || '
                          AND oors.order_group_id = ' || quote_literal(v_order_group_id) || '
                          AND oors.fiscal_year_week = ANY($1)' || v_locked_filter || '
                    )
                    UPDATE inventory_smart.oms_orders_recommended_store oors
                    SET ' ||
                    (CASE WHEN _set_clause <> '' THEN _set_clause || ', ' ELSE '' END) ||
                    'order_gen_type = CASE WHEN order_gen_type != ''Manual'' THEN ''Edited'' ELSE order_gen_type END,
                    updated_at = now(),
                    updated_by = ' || p_user_id || '
                    FROM store_filter sf, totals
                    WHERE oors.store_code = sf.store_code
                      ' || v_pa_sql || '
                      AND oors.order_group_id = ' || quote_literal(v_order_group_id) || '
                      AND oors.fiscal_year_week = ANY($1)' || v_locked_filter;

        EXECUTE _query USING v_fiscal_weeks;

        -- Quantity distribution
        IF v_distribute_order_quantity THEN
            _query := 'WITH store_filter AS (
                            SELECT store_code
                            FROM global.store_attributes_filter sf
                            WHERE 1=1 ' || v_sa_sql || '
                        ),
                        order_shares AS (
                            SELECT oors.id,
                                   oors.order_quantity,
                                   oors.roq_constrained::float AS roq_share,
                                   CASE 
                                        WHEN oors.id = ANY($2) THEN true 
                                        ELSE false 
                                    END AS is_locked
                            FROM inventory_smart.oms_orders_recommended_store oors
                            JOIN store_filter sf ON oors.store_code = sf.store_code
                            WHERE oors.order_group_id = ' || quote_literal(v_order_group_id) || '
                              ' || v_pa_sql || '
                              AND oors.fiscal_year_week = ANY($1)
                        ),
                        total_shares AS (
                            SELECT 
                            COALESCE(SUM(order_quantity) FILTER (WHERE is_locked), 0) AS locked_total,
                            COALESCE(SUM(roq_share) FILTER (WHERE NOT is_locked), 0) AS total_roq,
                            COUNT(*) FILTER (WHERE NOT is_locked) AS unlocked_count
                            FROM order_shares
                        ),
                        vals AS (
                            SELECT  GREATEST((' || v_order_quantity_total || ' - locked_total), 0)::int AS total
                            FROM total_shares
                        )
                        UPDATE inventory_smart.oms_orders_recommended_store t
                        SET 
                        order_quantity = 
                                CASE 
                                    WHEN ts.total_roq = 0 THEN CEIL(v.total::float / NULLIF(ts.unlocked_count, 0))
                                    ELSE CEIL((v.total::float * os.roq_share::float / ts.total_roq::float))::int
                                END,
                            order_gen_type = CASE WHEN t.order_gen_type != ''Manual'' THEN ''Edited'' ELSE t.order_gen_type END,
                            updated_at = now(),
                            updated_by = ' || p_user_id || '
                        FROM vals v, order_shares os, total_shares ts
                        WHERE t.id = os.id
                        AND os.is_locked = false;';

            EXECUTE _query USING v_fiscal_weeks, v_locked_ids;
        END IF;

        updated_order_group_ids := array_append(updated_order_group_ids,v_order_group_id);
    END LOOP;

    RETURN updated_order_group_ids;
END;
$function$;