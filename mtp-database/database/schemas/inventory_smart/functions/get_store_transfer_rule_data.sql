--liquibase formatted sql
--changeset ananya.gupta:get_store_transfer_rule_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_store_transfer_rule_data
--rollback: SELECT 1

DROP FUNCTION if exists inventory_smart.get_store_transfer_rule_data(refcursor, int4, _text, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_store_transfer_rule_data(input refcursor, rule_id integer, _store_cols text[], p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_c            text;
    v_dest_cols    text := '';          
    v_src_cols     text := '';         
    _query_all     text;
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    _meta_clause   text := '';
BEGIN
    /*
Sample call:
select inventory_smart.get_store_transfer_rule_data(
'cur1',                           
   60,
    ARRAY['region','city'],
    '{"limit":{"limit":10,"page":1}}'::jsonb
);
FETCH ALL FROM cur1;
*/
    
    IF _store_cols IS NOT NULL AND array_length(_store_cols,1) IS NOT NULL THEN
        FOREACH v_c IN ARRAY _store_cols LOOP
            v_c := lower(trim(v_c));
            v_dest_cols := v_dest_cols
                || CASE WHEN v_dest_cols = '' THEN '' ELSE ', ' END
                || format('dest.%I AS %I', v_c, v_c || '_dest');

            v_src_cols := v_src_cols
                || CASE WHEN v_src_cols = '' THEN '' ELSE ', ' END
                || format('src.%I AS %I', v_c, v_c || '_source');
        END LOOP;
    END IF;

    
    _meta_clause := inventory_smart.form_table_query(COALESCE(p_meta, '{}'::jsonb));

   
    _query_all := format($SQL$
        SELECT *
        FROM (
            SELECT
                sm.mapping_id,

                -- Destination store (always include codes/names)
                dest.store_code AS store_code_dest,
                dest.store_name AS store_name_dest
                %s              

                -- Source store
                ,src.store_code  AS store_code_source
                ,src.store_name  AS store_name_source
                %s               

                -- Mapping attributes (typed)
                ,(sm.store_mapping_attributes->>'priority')::int                  AS priority
                ,(sm.store_mapping_attributes->>'distance_km')::numeric           AS distance
                ,(sm.store_mapping_attributes->>'lead_time_days')::numeric        AS lead_time
                ,(sm.store_mapping_attributes->>'product_level_min_qty')::numeric AS product_level_min_qty
                ,(sm.store_mapping_attributes->>'overall_min_qty')::numeric       AS overall_min_qty

            FROM inventory_smart.store_mapping sm
            JOIN global.store_attributes_filter dest
              ON dest.store_code = sm.destination_store_code
            JOIN global.store_attributes_filter src
              ON src.store_code  = sm.source_store_code
            WHERE sm.rule_id = $1
        ) t
        %s
    $SQL$,
        CASE WHEN v_dest_cols = '' THEN '' ELSE ', ' || v_dest_cols END,
        CASE WHEN v_src_cols  = '' THEN '' ELSE ', ' || v_src_cols  END,
        _meta_clause
    );

    RAISE NOTICE 'Final Query: %', _query_all;

    OPEN input FOR EXECUTE _query_all USING rule_id;

    PERFORM global.sp_log(
        v_gen_random_uuid,
        'inventory_smart.get_store_transfer_rule_data',
        'Before returning function value',
        _query_all,
        jsonb_build_object(
            'rule_id', rule_id,
            'store_cols', _store_cols,
            'meta', p_meta
        )
    );

    RETURN input;
END;
$function$
;