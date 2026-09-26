--liquibase formatted sql
--changeset chaitanyaprasad.reddy:MTP-28240_save_hotfix_mtp-30930_mtp-61295 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-28240_save_hotfix_mtp-30930_mtp-61295
--comment: Fixed limit reached error mtp 30930 , MTP-61295: added 'description' for saving filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.save_fuc_mapping(integer, input jsonb);
CREATE OR REPLACE FUNCTION global.save_fuc_mapping(integer, input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_user_id int;
	_key text;
	_value text;
	_screen_name text;
	_attribute_value text;
	_is_default bool;
	_fuc_name text;
	_count_check_query text;
	_query_screen_code text;
	_query_fuc_save text;
	_description text;
	_counter int;
	_screen_code integer;
	_existing_is_default_query text;
	_is_default_update_query text;
	_config_type text;
	_delete_existing_configs text;
	_max_counter int := 20;
	_is_broadcast bool := false;
	_existing_broadcast_default_query text;
	_broadcast_count_check_query text;
	_broadcast_counter int;
	_default_users_json jsonb := '{}'::jsonb;
	_broadcast_screen_names text[];
	_existing_broadcast_screen_query text;
	_screen_names text[];
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			if _key = 'screen_name' then
				_screen_name := _value;
				_broadcast_screen_names := _broadcast_screen_names || array[lower(_value)];
				_screen_names := _screen_names || array[lower(_value)];
			elseif _key = 'saved_filter_preference' then
				_attribute_value := '{"' || _key || '":' || _value || '}';
			elseif _key = 'is_default' then
				_is_default := _value;
			elseif _key = 'name' then
				_fuc_name := _value;
			elseif _key = 'config_type' then
				_config_type := _value;
			elseif _key = 'save_limit' then
				_max_counter := _value;
			elseif _key = 'is_broadcast' then
				_is_broadcast := _value;
			elseif _key = 'description' then
				_description := _value;
			end if;
		end loop;
		
		-- if _description is <NULL> making it '' for further queries
		_description = COALESCE(_description, '');
		
		if _config_type = 'global-screen' and _screen_names[1] != 'all' then
			_screen_names := _screen_names || ARRAY['all'];
		end if;

		_query_screen_code := 'SELECT screen_code FROM "global".screen_master sm WHERE lower(screen_name) IN (' || array_to_string(array(SELECT quote_literal(unnest(_screen_names))), ', ') || ') AND is_active';
		raise notice ' screen query %', _query_screen_code;
	
		_count_check_query := 'select count(fuc_code) from "global".filter_user_configurations_mapping where ((created_by = ' || $1 || ' or is_broadcast is true) and screen_code in (' || _query_screen_code || '))';
		_broadcast_count_check_query := 'select count(fuc_code) from "global".filter_user_configurations_mapping where is_broadcast is true';
		raise notice ' count query %', _count_check_query;
	
		execute _count_check_query into _counter;
		execute _broadcast_count_check_query into _broadcast_counter;
	
		raise notice ' counter value %, ', _counter;
		--Overriding it to just screen name for save query
		_query_screen_code := 'select screen_code from "global".screen_master sm where lower(screen_name) = ''' || lower(_screen_name) || ''' and is_active';
	
		_query_fuc_save := 'INSERT INTO "global".filter_user_configurations_mapping
							(screen_code, fuc_name, is_default, created_at, updated_at, created_by, updated_by, attribute_value, is_broadcast, description)
								(select (' || _query_screen_code || '), ''' || _fuc_name || ''',' || _is_default || ', now(), now(), ' || $1|| ',' || $1 || ',''' || _attribute_value || ''', ' || _is_broadcast || ', ''' || _description || ''') ON CONFLICT (created_by, screen_code, fuc_name) DO Update set attribute_value = ''' || _attribute_value || ''' , updated_at = now(), description = ''' || _description || ''' ';
		
		if _config_type = 'global' then
			raise notice 'query save %', _query_fuc_save;
			execute _query_fuc_save;
		else
				if _counter < _max_counter then
					if _is_default then
						_existing_is_default_query := 'select fuc_code from "global".filter_user_configurations_mapping where is_default and created_by = ' || $1 || ' and screen_code in (' || _query_screen_code || ')';
						_is_default_update_query := 'update "global".filter_user_configurations_mapping set is_default = false where fuc_code in (' || _existing_is_default_query || ')';
						
						raise notice ' update default query % ', _is_default_update_query;	
						execute _is_default_update_query;
						if _broadcast_screen_names[1] != 'all' then
							_broadcast_screen_names := _broadcast_screen_names || ARRAY['all'];
						end if;
						raise notice 'broadcast screen names: %', array_to_string(_broadcast_screen_names, ', ');

					    _existing_broadcast_screen_query := 'SELECT screen_code FROM "global".screen_master sm ' ||
    						'WHERE lower(sm.screen_name) IN (' || array_to_string(array(SELECT quote_literal(unnest(_broadcast_screen_names))), ', ') || ') AND is_active';
					
					    raise notice 'existing broadcast screen query: %', _existing_broadcast_screen_query;
					
					    _existing_broadcast_default_query := 'UPDATE "global".filter_user_configurations_mapping 
					        SET is_default_to_users = is_default_to_users - ' || $1 || '::TEXT
					        WHERE is_broadcast IS TRUE and screen_code IN (' || _existing_broadcast_screen_query || ')';
					    
					    raise notice 'existing broadcast default query: %', _existing_broadcast_default_query;
					   	execute _existing_broadcast_default_query;
					end if;
					
					if _is_default and _is_broadcast then
						_default_users_json := jsonb_set(
				        '{}'::JSONB,
				        ARRAY[$1::TEXT],
				        to_jsonb(now())
				    	);
				    	_is_default := false;
					end if;
					raise notice ' %', _default_users_json;
					_query_fuc_save := 'INSERT INTO "global".filter_user_configurations_mapping
								(screen_code, fuc_name, is_default, created_at, updated_at, created_by, updated_by, attribute_value, is_broadcast, is_default_to_users, description)
									(select (' || _query_screen_code || '), ''' || _fuc_name || ''',' || _is_default || ', now(), now(), ' || $1|| ',' || $1 || ',''' || _attribute_value || ''',' || _is_broadcast || ',''' || _default_users_json || ''', ''' || _description || ''')';
					raise notice 'query save %', _query_fuc_save;	
					execute _query_fuc_save;
				else
					raise notice 'reached limit %', _counter;
					raise exception 'Limit exceeded: Maximum count reached.';
				end if;
		end if;
		
	end $function$
;
