--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:perform_match_with_version runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for perform_match_with_version
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.perform_match_with_version(int4, int4, _int4, _text, _text, text);

CREATE OR REPLACE FUNCTION item_smart.perform_match_with_version(start_week integer, end_week integer, hierarchy_codes integer[], channel_ids text[], list_of_kpis text[], plan_version text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    rows_updated INT := 0;
    query_text TEXT;
BEGIN
    IF plan_version = 'ly' THEN
        -- Construct the query for match_with_ly
        query_text := format('SELECT item_smart.match_with_ly(%s, %s, %L, %L, %L)', start_week, end_week, hierarchy_codes, channel_ids, list_of_kpis);
    ELSIF plan_version = 'iaf' THEN
        -- Construct the query for match_with_iaf
        query_text := format('SELECT item_smart.match_with_iaf(%s, %s, %L, %L, %L)', start_week, end_week, hierarchy_codes, channel_ids, list_of_kpis);
    ELSIF plan_version = 'op' THEN
        -- Construct the query for match_with_op
        query_text := format('SELECT item_smart.match_with_op(%s, %s, %L, %L, %L)', start_week, end_week, hierarchy_codes, channel_ids, list_of_kpis);
    ELSE
        -- Handle unsupported version
        RAISE EXCEPTION 'Unsupported version: %', plan_version;
    END IF;

    -- Execute the constructed query
    EXECUTE query_text INTO rows_updated;

    -- Return the count of rows updated
    RETURN rows_updated;
EXCEPTION
    WHEN others THEN
        -- Handle exceptions
        RETURN -1; 
END;
$function$
;
