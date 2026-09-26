--liquibase formatted sql
--changeset liquibase:add_notification_for_user runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_notification_for_user
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_notification_for_user(data json);
CREATE OR REPLACE FUNCTION global.add_notification_for_user(data json)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	no_code int;
	_key text;
	_value text;
	_query text;
	_keys text[];
	_vals text[];
    _event json;
    _event_vals text[];
	_channels json;
	_channel_ary_query text;
	_channel_ary text[];
    _counter integer := 1;
    _vals_list text[];
	begin
        
    	for _event in SELECT * FROM json_array_elements($1) loop
            for _key, _value in SELECT * FROM jsonb_each_text(_event::jsonb) WHERE value IS NOT NULL loop 
            	if _counter = 1 then
                    _keys := array_append(_keys, _key);
				end if;
                _vals := array_append(_vals, '''' || _value || '''');
                -- _event_vals := array_append(_event_vals, _vals);
            end loop;
             _vals_list := array_append(_vals_list, '(' || (ARRAY_TO_STRING(_vals, ', ', '')) || ')');
			 _vals := array[]::text[];
			 _counter = _counter + 1;
        end loop;

		_query := 'INSERT INTO "global".notifications_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES ' || (ARRAY_TO_STRING(_vals_list, ', ', '')) || 'ON CONFLICT (created_for, event_id) DO NOTHING' || ';';		
		raise notice '%', _query;
 		execute _query;
	end
$function$
;


CREATE OR REPLACE FUNCTION global.add_notification_for_user(input jsonb, created_for integer, created_by integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	no_code int;
	_key text;
	_value text;
	_query text;
	_keys text[] := array['created_for', 'created_by', 'updated_by']::text[];
	_vals text[] := array[$2, $3, $3]::text[];
	_channels json;
	_channel_ary_query text;
	_channel_ary text[];

	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 

			if _key = 'channels' then
				_channel_ary_query = 'SELECT array_agg(ary)::text[] FROM jsonb_array_ele33ments_text(''' || _value || ''') AS ary;';
				execute _channel_ary_query into _channel_ary;
				raise notice '%', '''{' || array_to_string(_channel_ary, ',') || '}''';
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals,  '''{' || array_to_string(_channel_ary, ',') || '}''');
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
			
		end loop;

		_query := 'INSERT INTO "global".notifications_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ')' || 'ON CONFLICT (created_for, event_id) DO NOTHING' || ' returning no_code;';
		raise notice '%', _query;
 		execute _query into no_code;
        return no_code;
	end
$function$
;
