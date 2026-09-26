--liquibase formatted sql
--changeset liquibase:update_notification_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_notification_event
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_notification_event(input jsonb, noe_code integer, user_id integer);
CREATE OR REPLACE FUNCTION global.update_notification_event(input jsonb, noe_code integer, user_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	noe_code int := $2;
	_key text;
	_value text;
	_query text;
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_roles json;
	_role int;
	_role_vals text[];
	_screen_id int;
	_channels json;
	_channel_ary_query text;
	_channel_ary text;
	ary text[];
	_role_cleanup_query text;
	_role_mapping_query text;
	_trigger_mapping_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'role_codes' then
				_roles := _value;
			elseif _key = 'screen_id' then
				_screen_id := _value;
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));

			end if;
		end loop;

		_query := 'UPDATE "global".notification_event_master SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where noe_code = ' || noe_code || ';';
		raise notice '%', _query;
		execute _query;
		
		for _role in SELECT * FROM json_array_elements(_roles) loop
			_role_vals := array_append(_role_vals, ('(' || noe_code || ', ''' || (_role) || ''')'));
		end loop;
		
		_role_cleanup_query := 'delete from "global".notification_event_role_mapping where noe_code = ' || noe_code || ';';
		_role_mapping_query := 'INSERT INTO "global".notification_event_role_mapping (noe_code, role_code) VALUES' || (ARRAY_TO_STRING(_role_vals, ', ', '')) || ';';
		raise notice '%', _role_cleanup_query;
		raise notice '%', _role_mapping_query;
		execute _role_cleanup_query;
		execute _role_mapping_query;
		
		_trigger_mapping_query := 'UPDATE "global".notification_event_trigger_mapping SET not_code = ' || _screen_id || ' where noe_code = ' || noe_code || ';';

		raise notice '%', _trigger_mapping_query;
		execute _trigger_mapping_query;
		
	end
$function$
;
