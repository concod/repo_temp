--liquibase formatted sql
--changeset rahul.chodvadiya@impactanalytics.co:match_with_version_master_plan_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_master_plan_updates
--comment: master plan: create
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.match_with_version_master_plan(_text, int4, int4, _varchar, text, text);

CREATE OR REPLACE FUNCTION item_smart.match_with_version_master_plan(dept text[], start_week integer, end_week integer, channel_ids character varying[], plan_version text, time_zone text)
    RETURNS integer
    LANGUAGE plpgsql
AS $function$
DECLARE
    rows_updated INT := 0;
    query_text TEXT;
    error_message TEXT;
    dept_formatted TEXT;
    channel_ids_formatted TEXT;
    sub_channel_ids_formatted TEXT;
    has_valid_sub_channel BOOLEAN;
BEGIN
    -- Format dept array
    dept_formatted := array_to_string(ARRAY(
        SELECT quote_literal(unnest(dept))
    ), ',');

    -- Format channel_ids array
    channel_ids_formatted := array_to_string(ARRAY(
        SELECT quote_literal(unnest(channel_ids))
    ), ',');

    IF plan_version = 'lf' THEN
        -- Construct the query for match_with_lf
        query_text := format(
            'SELECT item_smart.insert_into_lf(ARRAY[%s]::text[], %s::integer, %s::integer, ARRAY[%s]::varchar[], %L)',
            dept_formatted,
            start_week,
            end_week,
            channel_ids_formatted,
            time_zone
        );
    ELSIF plan_version = 'op' THEN
        -- Construct the query for match_with_op
        query_text := format(
            'SELECT item_smart.insert_into_op_v2(ARRAY[%s]::text[], %s::integer, %s::integer, ARRAY[%s]::varchar[], %L)',
            dept_formatted,
            start_week,
            end_week,
            channel_ids_formatted,
            time_zone
        );
    ELSE
        -- Handle unsupported version
        RAISE EXCEPTION 'Unsupported version: %', plan_version;
    END IF;

    -- Debugging: Print the query
    RAISE NOTICE 'Constructed query: %', query_text;

    -- Execute the constructed query
    EXECUTE query_text INTO rows_updated;

    -- Return the count of rows updated
    RETURN rows_updated;
EXCEPTION
    WHEN others THEN
        -- Capture and log the error message
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE 'Error occurred: %', error_message;
        RETURN -1;
END;
$function$;
