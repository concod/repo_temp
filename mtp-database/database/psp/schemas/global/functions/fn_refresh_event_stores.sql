--liquibase formatted sql
--changeset liquibase:fn_refresh_event_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: new function fn_refresh_event_stores
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_refresh_event_stores;
CREATE OR REPLACE FUNCTION global.fn_refresh_event_stores(_event_id integer, _store_ids integer[] DEFAULT ARRAY[]::integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
BEGIN
    -- Delete Event Stores.
    DELETE FROM price_promo.event_store es WHERE es.event_id = _event_id;

    -- Insert New Event Stores.
    IF array_length(_store_ids, 1) > 0 then
    	execute format('create table if not exists price_promo.event_store_%1$s PARTITION OF price_promo.event_store FOR VALUES IN (%1$s)', _event_id);
        WITH event_stores_info_cte AS (
            SELECT 
                _event_id AS event_id,
                store_id
            FROM 
                global.tb_store_master sm 
            WHERE 
                sm.store_id = ANY(_store_ids)
        )
        INSERT INTO price_promo.event_store(event_id, store_id)
        SELECT 
            event_id, store_id
        FROM 
            event_stores_info_cte;
    END IF;

    RETURN 1;
END;
$function$
;