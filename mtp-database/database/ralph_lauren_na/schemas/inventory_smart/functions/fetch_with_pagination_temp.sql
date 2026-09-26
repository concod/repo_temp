--liquibase formatted sql
--changeset liquibase:fetch_with_pagination_temp runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:Release_1_0_1
--comment: Release_1_0_1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.fetch_with_pagination_temp(input refcursor, query text, count_query text, formatter jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.fetch_with_pagination_temp(
    input refcursor,
    query text,
    count_query text,
    formatter jsonb
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    _count int := 1;
    _batch_count int := 0;
    _initial_limit int;
    _limit int;
    _offset int;
    _sub_limit int;
    _sub_offset int;
    _limit_final text;
    _sub_limit_final text;
    _local_formatter jsonb;
    _query_combine text;
    _accumulated_count int := 0;
    _cursor_name alias for input;-- Use the passed cursor name
BEGIN
    -- Extract pagination values from the formatter
    _limit := (formatter->'limit'->>'limit')::int;
    _initial_limit := _limit;
    _offset := (formatter->'limit'->>'offset')::int;
    _sub_limit := (formatter->'limit'->>'sub_limit')::int;
    _sub_offset := (formatter->'limit'->>'sub_offset')::int;

    -- Create a temporary table to accumulate results
	DROP TABLE IF EXISTS temp_fetch_pagination_accumulator;
    CREATE TEMP TABLE IF NOT EXISTS temp_fetch_pagination_accumulator AS
    SELECT * FROM (SELECT 1) dummy WHERE false;

    -- If no limit is set, fetch all records
    IF _limit = -1 THEN
        _local_formatter := json_build_object('select', '*', 'limit_final', '', 'sub_limit_final', '');
        _query_combine := inventory_smart.format_with_json(query, formatter || _local_formatter);
        OPEN _cursor_name FOR EXECUTE _query_combine;
        RETURN _cursor_name;
    END IF;

    -- Batched fetching loop
    WHILE _count = 0 AND (_batch_count = 0 OR _batch_count IS NULL) LOOP
        -- Prepare the query with limits and offsets
        _limit_final := format('LIMIT %s OFFSET %s', _limit, _offset);
        _sub_limit_final := format('LIMIT %s OFFSET %s', _sub_limit, _sub_offset);

        _local_formatter := json_build_object(
            'select', '*',
            'limit_final', _limit_final,
            'sub_limit_final', _sub_limit_final,
            'limit', _limit,
            'offset', _offset,
            'sub_limit', _sub_limit,
            'sub_offset', _sub_offset
        );

        _query_combine := inventory_smart.format_with_json(query, formatter || _local_formatter);
		
		raise notice '%', _query_combine;
        EXECUTE format('INSERT INTO temp_fetch_pagination_accumulator %s', _query_combine);

        -- Check the accumulated count
        EXECUTE 'SELECT COUNT(1) FROM temp_fetch_pagination_accumulator' INTO _accumulated_count;

        IF _accumulated_count >= _initial_limit THEN
            OPEN _cursor_name FOR
            EXECUTE format('SELECT * FROM temp_fetch_pagination_accumulator LIMIT %s', _initial_limit);
            RETURN _cursor_name;
        END IF;

        -- Get the batch count
        _local_formatter := _local_formatter || jsonb_build_object('select', 'COUNT(*)');
        _query_combine := inventory_smart.format_with_json(query, formatter || _local_formatter);
		
		raise notice '%', _query_combine;
        EXECUTE _query_combine INTO _batch_count;

        -- Adjust limits and offsets based on batch count
        IF _batch_count IS NULL OR _batch_count = 0 THEN
            _query_combine := inventory_smart.format_with_json(count_query, formatter || _local_formatter);
			raise notice '%', _query_combine;
            EXECUTE _query_combine INTO _count;
        END IF;

        IF (_batch_count IS NULL OR _batch_count = 0) AND _count > 0 THEN
            _offset := _offset + _limit;
            _limit := _limit + _limit;
            _sub_offset := 0;
        ELSE
            IF _limit != _initial_limit AND (_batch_count != 0 AND _batch_count IS NOT NULL) THEN
                _limit := _limit / 2;
                _batch_count := 0;
            END IF;
        END IF;
    END LOOP;
    raise notice 'endedddd';
	raise notice '%', _accumulated_count;
    -- Final fallback: return the accumulated records
IF _accumulated_count > 0 THEN
    OPEN _cursor_name FOR
    EXECUTE format('SELECT * FROM temp_fetch_pagination_accumulator');
ELSE
    OPEN _cursor_name FOR SELECT * FROM (SELECT NULL::INTEGER WHERE FALSE) AS empty; 
END IF;

RETURN _cursor_name;

END;
$function$
;