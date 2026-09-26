--liquibase formatted sql
--changeset liquibase:fn_fetch_store_ids_by_hierarchy_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: function_change_2 fn_fetch_store_ids_by_hierarchy_2
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_fetch_store_ids_by_hierarchy;
CREATE OR REPLACE FUNCTION global.fn_fetch_store_ids_by_hierarchy(
    _s0_ids integer[] DEFAULT ARRAY[]::integer[], 
    _s1_ids integer[] DEFAULT ARRAY[]::integer[], 
    _s2_ids integer[] DEFAULT ARRAY[]::integer[], 
    _s3_ids integer[] DEFAULT ARRAY[]::integer[], 
    _s4_ids integer[] DEFAULT ARRAY[]::integer[], 
    _s5_ids integer[] DEFAULT ARRAY[]::integer[],
    _market_ids integer[] DEFAULT ARRAY[]::integer[],
    _store_ids integer[] DEFAULT ARRAY[]::integer[],
    _active_flag integer[] DEFAULT ARRAY[]::integer[]
)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
DECLARE
    pg_hierarchy_where text[];
    stores_query text;
    store_ids integer[] := null::integer[];
BEGIN
   	IF array_length(_s0_ids, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.s0_id IN (%1$s) ', array_to_string(_s0_ids, ',')));
    END IF;
    IF array_length(_s1_ids, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.s1_id IN (%1$s) ', array_to_string(_s1_ids, ',')));
    END IF;
    IF array_length(_s2_ids, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.s2_id IN (%1$s) ', array_to_string(_s2_ids, ',')));
    END IF;
    IF array_length(_s3_ids, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.s3_id IN (%1$s) ', array_to_string(_s3_ids, ',')));
    END IF;
    IF array_length(_s4_ids, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.s4_id IN (%1$s) ', array_to_string(_s4_ids, ',')));
    END IF;
    IF array_length(_s5_ids, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.s5_id IN (%1$s) ', array_to_string(_s5_ids, ',')));
    END IF;
    IF array_length(_market_ids, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.market_id IN (%1$s) ', array_to_string(_market_ids, ',')));
    END IF;
    IF array_length(_store_ids, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.store_id IN (%1$s) ', array_to_string(_store_ids, ',')));
    END IF;
    IF array_length(_active_flag, 1) > 0 THEN 
        pg_hierarchy_where := array_append(pg_hierarchy_where, format(' AND tsm.is_active IN (%1$s) ', array_to_string(_active_flag, ',')));
    END IF;
    

    IF array_length(pg_hierarchy_where, 1) > 0 THEN
        stores_query := format('
            SELECT 
                array_agg(DISTINCT tsm.store_id)
            FROM 
                global.tb_store_master tsm
            WHERE 
                tsm.is_active = 1
                %1$s
            ', array_to_string(pg_hierarchy_where, ' '));
        EXECUTE stores_query INTO store_ids;
    END IF;
    RETURN store_ids;
END;
$function$
;
