--liquibase formatted sql
--changeset ananya.gupta:save_transfer_rule_from_preview runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for save_transfer_rule_from_preview
--rollback: SELECT 1

DROP FUNCTION if exists inventory_smart.save_transfer_rule_from_preview(text, text, text, jsonb, bool, _int4, jsonb);

DROP FUNCTION if exists inventory_smart.save_transfer_rule_from_preview(text, text, text, jsonb, bool, _int4, jsonb, text);
DROP FUNCTION if exists inventory_smart.save_transfer_rule_from_preview(text, text, text, jsonb, bool, _int4, jsonb, text,text,text);

CREATE OR REPLACE FUNCTION inventory_smart.save_transfer_rule_from_preview(p_temp_table_name text, p_rule_name text, p_transfer_within text, p_meta jsonb, p_is_all_records boolean, p_excluded_rows integer[], p_included_rows jsonb, p_user_id text,store_groups text,linkage_cluster text)
 RETURNS TABLE(rule_id integer, inserted_rows bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rule_id int;
    v_excluded_ids bigint[];
    v_included_ids bigint[];
    v_channels text;
    r jsonb;
	_meta_clause text;
	v_priority int;
    v_prod_min numeric;
    v_overall_min numeric;
    v_preview_rule_id int;
BEGIN
       /*
Sample call:
SELECT * FROM inventory_smart.save_transfer_rule_from_preview(
    'temp_table_123',
    'test_122',
    'CROSS CHANNEL REBALANCING',
    '{}'::jsonb,
    true,
    ARRAY[]::integer[],
    '[{"preview_rule_id": 6, "overall_min_qty": 100, "priority": [
                {
                    "label": "1",
                    "value": 1
                }
            ]}]'::jsonb,
    '251',
    'IA Default MEXICO FRANCHISE MAINLINE Store Group,IA Default MEXICO RETAIL OUTLET Store Group',
'city'
);
FETCH ALL FROM cur1;
*/

    EXECUTE format(
        'INSERT INTO inventory_smart.store_transfer_rule
            (rule_name, transfer_within,created_by, store_groups,linkage_cluster,created_at, updated_at, is_deleted, is_default)
         VALUES (%L, %L, %L, %L,%L,now(), now(), false, false)
         RETURNING rule_id',
        p_rule_name,
        p_transfer_within,
		p_user_id,
		store_groups,
		linkage_cluster
		
    ) INTO v_rule_id;
	raise notice 'rule_id: %', v_rule_id;

    IF jsonb_array_length(p_included_rows) > 0 THEN
		FOR r IN SELECT * FROM jsonb_array_elements(p_included_rows) LOOP
        v_priority := ((r->'priority')->0->>'value')::int;
        v_prod_min := (r->>'product_level_min_qty')::numeric;
        v_overall_min := (r->>'overall_min_qty')::numeric;
        v_preview_rule_id := (r->>'preview_rule_id')::int;

        EXECUTE format(
            'UPDATE public.%I
             SET priority = COALESCE(%L, priority),
                 product_level_min_qty = COALESCE(%L, product_level_min_qty),
                 overall_min_qty       = COALESCE(%L, overall_min_qty)
             WHERE preview_rule_id = %L',
            p_temp_table_name,
            v_priority,
            v_prod_min,
            v_overall_min,
            v_preview_rule_id
        );
    END LOOP;
    END IF;


    v_excluded_ids := COALESCE(p_excluded_rows, ARRAY[]::bigint[]);

	_meta_clause := inventory_smart.form_table_query(COALESCE(p_meta, '{}'::jsonb));


    IF p_is_all_records THEN
        EXECUTE format($q$
            INSERT INTO inventory_smart.store_mapping
                (rule_id, source_store_code, destination_store_code, store_mapping_attributes)
            SELECT
                %s,
                t.src_store_id,
                t.dst_store_id,
                jsonb_build_object(
                    'priority',               t.priority,
                    'distance_km',            t.distance_km,
                    'lead_time_days',         t.lead_time_days,
                    'product_level_min_qty',  t.product_level_min_qty,
                    'overall_min_qty',        t.overall_min_qty
                )
            FROM (
                SELECT * FROM public.%I mt
                %s   
            ) t
            WHERE ( %L::bigint[] IS NULL OR t.preview_rule_id <> ALL (%L::bigint[]) )
        $q$, v_rule_id, p_temp_table_name, _meta_clause, v_excluded_ids, v_excluded_ids);
    ELSE
        v_included_ids := ARRAY(
          SELECT (x->>'preview_rule_id')::bigint FROM jsonb_array_elements(p_included_rows) x
        );

        EXECUTE format($q$
            INSERT INTO inventory_smart.store_mapping
                (rule_id, source_store_code, destination_store_code, store_mapping_attributes)
            SELECT
                %s,
                t.src_store_id,
                t.dst_store_id,
                jsonb_build_object(
                    'priority', t.priority,
                    'distance_km', t.distance_km,
                    'lead_time_days', t.lead_time_days,
                    'product_level_min_qty', t.product_level_min_qty,
                    'overall_min_qty', t.overall_min_qty
                )
            FROM public.%I t
            WHERE t.preview_rule_id = ANY (%L::bigint[]) 
        $q$, v_rule_id, p_temp_table_name, v_included_ids);
    END IF;


    SELECT string_agg(DISTINCT saf.channel, ', ')
    INTO v_channels
    FROM inventory_smart.store_mapping sm
    JOIN global.store_attributes_filter saf
      ON sm.destination_store_code = saf.store_code
    WHERE sm.rule_id = v_rule_id;

    UPDATE inventory_smart.store_transfer_rule st
    SET channel = v_channels,
        updated_at = now()
    WHERE st.rule_id = v_rule_id;

    RETURN QUERY
    SELECT v_rule_id, COUNT(*) FROM inventory_smart.store_mapping sm WHERE sm.rule_id = v_rule_id;
END;
$function$;