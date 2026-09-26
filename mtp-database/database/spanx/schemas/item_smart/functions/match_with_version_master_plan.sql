--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:match_with_version_master_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_brand_fix labels:match_with_version_master_plan_brand_fix
--comment: changeset for match_with_version_master_plan_brand_fix
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_version_master_plan(dept text[], start_week integer, end_week integer, channel_ids character varying[], sub_channel_ids character varying[], plan_version text, time_zone text, brand text[]);
CREATE OR REPLACE FUNCTION item_smart.match_with_version_master_plan(dept text[], start_week integer, end_week integer, channel_ids character varying[], sub_channel_ids character varying[], plan_version text, time_zone text, brand text[])
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
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
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

    -- Check if sub_channel contains at least one non-empty and non-whitespace value
    SELECT EXISTS (
        SELECT 1
        FROM unnest(sub_channel_ids) AS sub
        WHERE trim(sub) <> ''
    ) INTO has_valid_sub_channel;

    -- Format sub_channel_ids array only if it has valid values
    IF has_valid_sub_channel THEN
        sub_channel_ids_formatted := array_to_string(ARRAY(
            SELECT quote_literal(trim(sub))
            FROM unnest(sub_channel_ids) AS sub
            WHERE trim(sub) <> ''
        ), ',');
    END IF;

	RAISE NOTICE 'brand_param: %', brand;

    -- Determine which function to call based on plan_version
    IF plan_version = 'lf' THEN
        EXECUTE 
            'SELECT item_smart.insert_into_lf($1, $2, $3, $4, $5, $6,$7)'
        INTO rows_updated
        USING 
            dept,
            start_week,
            end_week,
            channel_ids,
            CASE WHEN has_valid_sub_channel THEN sub_channel_ids ELSE ARRAY['']::varchar[] END,
            time_zone,
			brand;
    ELSIF plan_version = 'op' THEN
        EXECUTE 
            'SELECT item_smart.insert_into_op_v2($1, $2, $3, $4, $5, $6,$7)'
        INTO rows_updated
        USING 
            dept,
            start_week,
            end_week,
            channel_ids,
            CASE WHEN has_valid_sub_channel THEN sub_channel_ids ELSE ARRAY['']::varchar[] END,
            time_zone,
			brand;
    ELSE
        RAISE EXCEPTION 'Unsupported version: %', plan_version;
    END IF;

    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.match_with_version_master_plan', 'before returning rows_updated', dept_formatted, jsonb_build_object('dept',$1, 'start_week',$2, 'end_week',$3, 'channel_ids',$4, 'sub_channel_ids',$5, 'plan_version',$6, 'time_zone',$7));

    -- Return the count of rows updated
    RETURN rows_updated;
EXCEPTION
    WHEN others THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE 'Error occurred: %', error_message;
        RETURN -1;
END;
$function$
;