--liquibase formatted sql
--changeset ananya.gupta:create_preview_rules_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_preview_rules_v2
--rollback: SELECT 1

 DROP FUNCTION if EXISTS inventory_smart.create_preview_rules_v2(text, text, _int4, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.create_preview_rules_v2(_temp_tbl_name text, _transfer_type text, _store_group_ids integer[], _cluster_by text, _from_channel text, _to_channel text, _config jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    sql                text;
    v_cluster_expr     text;
    v_store_cols       text[] := ARRAY[]::text[];
    v_prod_min         int    := 0;
    v_overall_min      int    := 0;
    v_cols_uniq        text := '';  
    v_cols_src         text := '';  
    v_cols_dst         text := '';  
    v_c                text;
    v_prod_min_txt     text;
    v_overall_min_txt  text;
BEGIN
    /*
Sample call:
select * from inventory_smart.create_preview_rules_v2(
'temp_table_123',
 'CROSS CHANNEL REBALANCING',     
    ARRAY[1, 2, 33],                   
    'all stores',                   
   null,                   
    null,
     '{"additional_select_columns": [
                "region",
                "district",
                "state",
                "city"
            ],
            "product_level_min_qty": "10",
            "overall_min_qty": "50"

        }'
);
*/
    IF _config ? 'additional_select_columns' THEN
        SELECT COALESCE(ARRAY(
                   SELECT jsonb_array_elements_text(_config->'additional_select_columns')
               ), ARRAY[]::text[])
          INTO v_store_cols;
    END IF;

    v_prod_min_txt    := NULLIF(TRIM(_config->>'product_level_min_qty'), '');
    v_overall_min_txt := NULLIF(TRIM(_config->>'overall_min_qty'), '');

    v_prod_min    := COALESCE(v_prod_min_txt::int, 0);
    v_overall_min := COALESCE(v_overall_min_txt::int, 0);

   
    IF lower(_cluster_by) = 'all stores' THEN
        v_cluster_expr := quote_literal('ALL');
    ELSIF lower(_cluster_by) = 'store group' THEN
        v_cluster_expr := 'sgm.sg_code::text';
    ELSE
        v_cluster_expr := format('saf.%I', _cluster_by);
    END IF;

    IF v_store_cols IS NOT NULL AND array_length(v_store_cols, 1) IS NOT NULL THEN
        FOREACH v_c IN ARRAY v_store_cols LOOP
            v_cols_uniq := v_cols_uniq
                || CASE WHEN v_cols_uniq = '' THEN '' ELSE ', ' END
                || format('saf.%I AS %I', v_c, v_c);

            v_cols_src := v_cols_src
                || CASE WHEN v_cols_src = '' THEN '' ELSE ', ' END
                || format('s.%I AS src_%I', v_c, v_c);

            v_cols_dst := v_cols_dst
                || CASE WHEN v_cols_dst = '' THEN '' ELSE ', ' END
                || format('d.%I AS dst_%I', v_c, v_c);
        END LOOP;
    END IF;

    EXECUTE format('DROP TABLE IF EXISTS public.%I', _temp_tbl_name);

    sql := format($q$
        CREATE UNLOGGED TABLE public.%I AS
        WITH uniq_stores AS (
            SELECT DISTINCT
                saf.store_code,
                saf.store_name,
                saf.channel
                %s                      
              , %s AS cluster_key
            FROM global.store_attributes_filter saf
            JOIN global.store_groups_mapping sgm
              ON sgm.store_code = saf.store_code
            WHERE saf.active = TRUE
              AND COALESCE(saf.is_deleted, FALSE) = FALSE
              AND sgm.sg_code = ANY(%L::int[])
        ),
        pairs AS (
            SELECT
                s.store_code AS src_store_id,
                s.store_name AS src_store_name,
                s.channel    AS src_channel
                %s                     
              , d.store_code AS dst_store_id
              , d.store_name AS dst_store_name
              , d.channel    AS dst_channel
                %s                     
              , s.cluster_key
            FROM uniq_stores s
            JOIN uniq_stores d
              ON s.cluster_key = d.cluster_key
             AND s.store_code <> d.store_code
            WHERE (
                (%L = 'WITHIN CHANNEL REBALANCING'  AND s.channel = d.channel)
             OR (%L = 'CROSS CHANNEL REBALANCING')
             OR (%L = 'CROSS CHANNEL PUSH'
                 AND (%L IS NULL OR s.channel = %L)
                 AND (%L IS NULL OR d.channel = %L)
             )
            )
        ),
        dst_counts AS (
            SELECT dst_store_id, COUNT(*) AS src_count
            FROM pairs
            GROUP BY 1
        ),
        enriched AS (
            SELECT
                p.*,
                t.distance_km,
                t.lead_time_days,
                ROW_NUMBER() OVER (
                    PARTITION BY p.dst_store_id
                    ORDER BY t.lead_time_days, t.distance_km NULLS LAST
                ) AS priority
            FROM pairs p
            LEFT JOIN inventory_smart.store_to_store_transit t
              ON t.source_store_code = p.src_store_id
             AND t.destination_store_code = p.dst_store_id
             AND t.is_active = TRUE
        )
        SELECT
            e.*,
            dc.src_count,
            %s  AS product_level_min_qty,
            %s  AS overall_min_qty
        FROM enriched e
        JOIN dst_counts dc
          ON dc.dst_store_id = e.dst_store_id
    $q$,
        _temp_tbl_name,
        CASE WHEN v_cols_uniq = '' THEN '' ELSE ', ' || v_cols_uniq END,
        v_cluster_expr,
        _store_group_ids,
        CASE WHEN v_cols_src = '' THEN '' ELSE ', ' || v_cols_src END,
        CASE WHEN v_cols_dst = '' THEN '' ELSE ', ' || v_cols_dst END,
        _transfer_type, _transfer_type, _transfer_type,
        _from_channel, _from_channel,   
        _to_channel,   _to_channel,     
        v_prod_min,
        v_overall_min
    );

    EXECUTE sql;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN preview_rule_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY;', _temp_tbl_name);
    EXECUTE format('CREATE INDEX %I ON public.%I (dst_store_id);', _temp_tbl_name || '_dst_idx', _temp_tbl_name);
    EXECUTE format('CREATE INDEX %I ON public.%I (src_store_id);', _temp_tbl_name || '_src_idx', _temp_tbl_name);
    EXECUTE format('CREATE INDEX %I ON public.%I (dst_channel, src_channel);', _temp_tbl_name || '_ch_idx', _temp_tbl_name);
END;
$function$
;