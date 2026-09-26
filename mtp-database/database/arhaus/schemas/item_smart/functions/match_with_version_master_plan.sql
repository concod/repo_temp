--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:match_with_version_master_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_tz labels:with_time_zone
--comment: changeset for match_with_version_master_plan_tz
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_version_master_plan(dept text, start_week integer, end_week integer, channel_ids character varying[], plan_version text,time_zone text);
CREATE OR REPLACE FUNCTION item_smart.match_with_version_master_plan(
    dept text[],
    start_week integer,
    end_week integer,
    channel_ids character varying[],
    plan_version text,
    time_zone text
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    rows_updated INT := 0;
    query_text TEXT;
    error_message TEXT;
    dept_formatted TEXT;
    channel_ids_formatted TEXT;
BEGIN
    -- Input validation
    IF start_week > end_week THEN
        RAISE EXCEPTION 'start_week must be less than or equal to end_week';
    END IF;

    IF array_length(dept, 1) IS NULL THEN
        RAISE EXCEPTION 'dept array cannot be empty';
    END IF;

    IF array_length(channel_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'channel_ids array cannot be empty';
    END IF;

    -- Format dept array
    dept_formatted := array_to_string(ARRAY(
        SELECT quote_literal(unnest(dept))
    ), ',');

    -- Format channel_ids array
    channel_ids_formatted := array_to_string(ARRAY(
        SELECT quote_literal(unnest(channel_ids))
    ), ',');

    -- Determine which function to call based on plan_version
    IF plan_version = 'lf' THEN
        EXECUTE 
            'SELECT item_smart.insert_into_lf($1, $2, $3, $4, $5)'
        INTO rows_updated
        USING 
            dept,
            start_week,
            end_week,
            channel_ids,
            time_zone;
    ELSIF plan_version = 'op' THEN
        EXECUTE 
            'SELECT item_smart.insert_into_op_v2($1, $2, $3, $4, $5)'
        INTO rows_updated
        USING 
            dept,
            start_week,
            end_week,
            channel_ids,
            time_zone;
    ELSE
        RAISE EXCEPTION 'Unsupported version: %', plan_version;
    END IF;

    -- Return the count of rows updated
    RETURN rows_updated;
EXCEPTION
    WHEN others THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE 'Error occurred: %', error_message;
        RETURN -1;
END;
$function$;