--liquibase formatted sql
--changeset liquibase:add_notification_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_notification_event
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_notification_event(input jsonb, user_id integer);
CREATE OR REPLACE FUNCTION global.add_notification_event(input jsonb, user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	noe_code int;
	_key text;
	_value text;
	_query text;
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$2]::text[];
	_roles json;
	_role int;
	_role_vals text[];
	_screen_id int;
	_channels json;
	_channel_ary_query text;
	_channel_ary text;
	ary text[];
	_role_mapping_query text;
	_trigger_mapping_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'role_codes' then
				_roles := _value;
			elseif _key = 'screen_id' then
				_screen_id := _value;
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;

		_query := 'INSERT INTO "global".notification_event_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning noe_code;';
		raise notice '%', _query;
		execute _query into noe_code;
		
		for _role in SELECT * FROM json_array_elements(_roles) loop
			_role_vals := array_append(_role_vals, ('(' || noe_code || ', ''' || (_role) || ''')'));
		end loop;
		
		_role_mapping_query := 'INSERT INTO "global".notification_event_role_mapping (noe_code, role_code) VALUES' || (ARRAY_TO_STRING(_role_vals, ', ', '')) || ';';
		raise notice '%', _role_mapping_query;
		execute _role_mapping_query;

		_trigger_mapping_query := 'INSERT INTO "global".notification_event_trigger_mapping (noe_code, not_code) VALUES (' || noe_code || ', ' || _screen_id || ');';
		raise notice '%', _trigger_mapping_query;
		execute _trigger_mapping_query;
		
		return noe_code;
	end
$function$
;
