--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:match_with_version_master_plan_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:match_with_version_master_plan_v3
--comment: initial changeset for match_with_version_master_plan_v3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_version_master_plan_v3(_text, int4, int4, _varchar, text, _text, _text, text);
CREATE OR REPLACE FUNCTION item_smart.match_with_version_master_plan_v3(dept text[], start_week integer, end_week integer, channel_ids character varying[], plan_version text, where_clause_mv text[], where_clause_ch_mv text[], time_zone text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    rows_updated INT := 0;
    query_text TEXT;
    error_message TEXT;
    dept_formatted TEXT;
    channel_ids_formatted TEXT;
    where_clause_mv_formatted TEXT;
    where_clause_ch_mv_formatted TEXT;
BEGIN
    -- Input validation
    IF dept IS NULL OR array_length(dept, 1) = 0 THEN
        RAISE EXCEPTION 'Department parameter cannot be null or empty';
    END IF;

    IF start_week IS NULL OR end_week IS NULL THEN
        RAISE EXCEPTION 'Start week and end week parameters cannot be null';
    END IF;

    IF start_week > end_week THEN
        RAISE EXCEPTION 'Start week cannot be greater than end week';
    END IF;

    IF plan_version IS NULL OR plan_version = '' THEN
        RAISE EXCEPTION 'Plan version parameter cannot be null or empty';
    END IF;

    IF plan_version NOT IN ('lf', 'op') THEN
        RAISE EXCEPTION 'Unsupported plan version: %. Supported versions are: lf, op', plan_version;
    END IF;

    IF where_clause_mv IS NULL OR array_length(where_clause_mv, 1) = 0 THEN
        RAISE EXCEPTION 'where_clause_mv parameter cannot be null or empty';
    END IF;

    -- Format arrays for query construction 
    dept_formatted := array_to_string(ARRAY(
        SELECT quote_literal(unnest(dept))
    ), ',');

    channel_ids_formatted := array_to_string(ARRAY(
        SELECT quote_literal(unnest(channel_ids))
    ), ',');

    -- Format where clauses (don't quote_literal as these should be raw SQL conditions)
    where_clause_mv_formatted := array_to_string(where_clause_mv, ' AND ');
    where_clause_ch_mv_formatted := array_to_string(where_clause_ch_mv, ' AND ');

    -- Log formatted where clauses for debugging
    RAISE NOTICE 'where_clause_mv_formatted: %', where_clause_mv_formatted;
    RAISE NOTICE 'where_clause_ch_mv_formatted: %', where_clause_ch_mv_formatted;

    -- Construct query based on plan version
    IF plan_version = 'lf' THEN
        -- Construct the query for insert_into_lf_v3
        query_text := format(
            'SELECT item_smart.insert_into_lf_v3(ARRAY[%s]::text[], %s::integer, %s::integer, ARRAY[%s]::varchar[], ARRAY[%s]::text[], ARRAY[%s]::text[], %L)',
            dept_formatted,
            start_week,
            end_week,
            channel_ids_formatted,
            quote_literal(where_clause_mv_formatted),
            quote_literal(where_clause_ch_mv_formatted),
            time_zone
        );
    ELSIF plan_version = 'op' THEN
        -- Construct the query for insert_into_op_v3
        query_text := format(
            'SELECT item_smart.insert_into_op_v3(ARRAY[%s]::text[], %s::integer, %s::integer, ARRAY[%s]::varchar[], ARRAY[%s]::text[], ARRAY[%s]::text[], %L)',
            dept_formatted,
            start_week,
            end_week,
            channel_ids_formatted,
            quote_literal(where_clause_mv_formatted),
            quote_literal(where_clause_ch_mv_formatted),
            time_zone
        );
    END IF;

    -- Log the constructed query for debugging
    RAISE NOTICE 'Constructed query: %', query_text;

    -- Execute the constructed query
    BEGIN
        EXECUTE query_text INTO rows_updated;
        
        -- Log successful execution
        RAISE NOTICE 'Successfully processed % rows', rows_updated;
        
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            RAISE EXCEPTION 'Failed to execute query: %. Query: %', error_message, query_text;
    END;

    -- Return the count of rows updated
    RETURN rows_updated;

EXCEPTION
    WHEN OTHERS THEN
        -- Capture and log the error message with context
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE EXCEPTION 'Function execution failed: %', error_message;
END;
$function$
;