--liquibase formatted sql
--changeset suba.nataraj:intial runOnChange:true stripComments:false splitStatements:false context:MTP-73677-tmp-5 function labels:MTP-73677-tmp-5
--comment: MTP-73677-tmp-5 added comments
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.fetch_with_pagination(input refcursor, query text, count_query text, formatter jsonb);
CREATE or REPLACE function inventory_smart.fetch_with_pagination(input refcursor, query text, count_query text, formatter jsonb)
RETURNS refcursor
LANGUAGE plpgsql
AS $FUNCTION$
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
BEGIN
    _limit := jsonb_extract_path_text($4, 'limit');
    _initial_limit := _limit;
    _offset := jsonb_extract_path_text($4, 'offset');
    _sub_limit := jsonb_extract_path_text($4, 'sub_limit');
    _sub_offset := jsonb_extract_path_text($4, 'sub_offset');

    IF _limit = -1 THEN
        _local_formatter := json_build_object('select', '*', 'limit_final', '', 'sub_limit_final', '');
        _query_combine := inventory_smart.format_with_json($2, formatter || _local_formatter);
        raise notice '%', _query_combine;
        OPEN $1 FOR EXECUTE _query_combine;
        RETURN $1;
    END IF;

    WHILE _count > 0 AND (_batch_count = 0 or _batch_count is null) LOOP
        raise notice 'ab0';
        _limit_final = format(' LIMIT %s OFFSET %s', _limit, _offset);
        _sub_limit_final = format(' LIMIT %s OFFSET %s', _sub_limit, _sub_offset);
        _local_formatter := json_build_object(
            'select', '*',
            'limit_final', _limit_final,
            'sub_limit_final', _sub_limit_final,
            'limit', _limit,
            'offset', _offset,
            'sub_limit', _sub_limit,
            'sub_offset', _sub_offset
        );
        _query_combine := inventory_smart.format_with_json($2, formatter || _local_formatter);
        raise notice '%', _query_combine;
        OPEN $1 FOR EXECUTE _query_combine ;
        _local_formatter := _local_formatter || jsonb_build_object('select', 'COUNT(*)');
        _query_combine := inventory_smart.format_with_json($2, formatter || _local_formatter);
        raise notice '_batch_count %', _batch_count;
        raise notice '_query_combine %', _query_combine;
        EXECUTE _query_combine into _batch_count;
        raise notice 'batch count done';
        IF _batch_count is null or _batch_count = 0 THEN
            _query_combine := inventory_smart.format_with_json($3, formatter || _local_formatter);
            raise notice '_batch_count0 %', _query_combine;
            EXECUTE _query_combine into _count;
        END IF;

        -- raise notice 'count:% batch_count:% limit:% sub_limit:% offset:% sub_offset:%', _count, _batch_count, _limit, _sub_limit, _offset, _sub_offset;

        IF (_batch_count is null or _batch_count = 0) AND _count > 0 THEN
            _offset := _offset + _limit;
            _limit := _limit + _limit;
            _sub_offset := 0;
            CLOSE $1;
            raise notice 'ab1';
        ELSE
            IF _limit != _initial_limit AND (_batch_count != 0 and _batch_count is not null) THEN
                _limit := _limit / 2;
                _batch_count = 0;
                CLOSE $1;
                raise notice 'ab2';
            END IF;
            raise notice 'ab3';
        END IF;
    END LOOP;
    raise notice 'endedddd';
    RETURN $1;
END
$FUNCTION$