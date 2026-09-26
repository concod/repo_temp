--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_check_store_ids_in_event_selection runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_check_store_ids_in_event_selection

DROP FUNCTION IF EXISTS price_promo.fn_check_store_ids_in_event_selection;

CREATE OR REPLACE FUNCTION price_promo.fn_check_store_ids_in_event_selection(_event_id integer, _store_ids integer[])
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
    event_store_ids integer[];
    mismatch_exists boolean;
    
BEGIN
    -- Get event's store selection (stores in event_stores table for that event)
    SELECT array_agg(DISTINCT store_id)
    into event_store_ids
    FROM price_promo.event_stores
    WHERE event_id = _event_id;
    
    -- If event has no stores, return false
    IF event_store_ids IS NULL OR array_length(event_store_ids, 1) = 0 THEN
        RETURN false;
    END IF;
    
    RAISE NOTICE 'Event stores: %', array_length(event_store_ids, 1);
    
   -- Check if any store in _store_ids is not part of event_stores
    SELECT EXISTS (
        SELECT 1
        FROM global.tb_store_master sm
        WHERE sm.store_id = ANY(_store_ids)
        AND sm.store_id NOT IN (
            SELECT unnest(event_store_ids)
        )
    )
    INTO mismatch_exists;

    -- If any mismatch exists, return false; else true
    RETURN NOT mismatch_exists;
    
END;
$function$
;
