--liquibase formatted sql
--changeset liquibase:convert_json_array_to_pg_array runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for convert_json_array_to_pg_array
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.convert_json_array_to_pg_array(json_ary json);
CREATE OR REPLACE FUNCTION global.convert_json_array_to_pg_array(json_ary json)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_channel_ary_query text;
	_channel_ary text[];
    begin
        _channel_ary_query = 'SELECT array_agg(ary)::text[] FROM jsonb_array_elements_text(''' || $1 || ''') AS ary;';
        execute _channel_ary_query into _channel_ary;
        
        return '''{' || array_to_string(_channel_ary, ',') || '}''';
    end
$function$
;


CREATE OR REPLACE FUNCTION global.convert_json_array_to_pg_array(json_ary jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_channel_ary_query text;
	_channel_ary text[];
    begin
        _channel_ary_query = 'SELECT array_agg(ary)::text[] FROM jsonb_array_elements_text(''''' || $1 || ''''') AS ary;';
        execute _channel_ary_query into _channel_ary;
        
        return '''{' || array_to_string(_channel_ary, ',') || '}''';
    end
$function$
;
