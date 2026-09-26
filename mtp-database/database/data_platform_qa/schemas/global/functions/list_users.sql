--liquibase formatted sql
--changeset liquibase:list_users runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_users
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.list_users(input jsonb);
CREATE OR REPLACE FUNCTION global.list_users(input jsonb)
 RETURNS TABLE(user_list character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_keys text[] ;
 	_vals text[] ;
	_key text;
	_value text;
	_query_table_filters text := '';
	_query_combine text;
	_input_json json ;
	begin
		
		--_query_table_filters := "global".form_table_query($2);	
	 for _input_json in select json_array_elements(value::json) input_json from 
			(select value from jsonb_each_text($1)) x
	 loop	
	 	raise notice '%', _input_json;
		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
		loop 
	
		if 	_key ='user_name' then 
		_keys := array_append(_keys,_key);
		_vals := array_append(_vals, '''' || _value || '''');
		end if;
	
		end loop;
	end loop;
		_query_combine := 'SELECT * FROM (
select
		json_build_object (
			''user_name'', p.user_name,
			''email_id'', p.email
		) as user_list
from
	global.user_master p where p.user_name in (''' || _vals || ''')
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN query execute _query_combine;
 	end
$function$
;


CREATE OR REPLACE FUNCTION global.list_users(input jsonb, jsonb)
 RETURNS TABLE(user_list character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_keys text[] ;
 	_vals text[] ;
	_key text;
	_value text;
	_query_table_filters text := '';
	_query_combine text;
	_input_json json ;
	begin
		
		_query_table_filters := "global".form_table_query($2);	
	 for _input_json in select json_array_elements(value::json) input_json from 
			(select value from jsonb_each_text($1::jsonb)) x
	 loop	
		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
		loop 
	
		if 	_key ='user_name' then 
		_keys := array_append(_keys,_key);
		_vals := array_append(_vals, '''' || _value || '''');
		end if;
	
		end loop;
	end loop;

		raise notice '%',_vals;
		_query_combine := 'SELECT * FROM (
select
		json_build_object (
			''user_name'', p.user_name,
			''email_id'', p.email
		) as user_list
from
	global.user_master p where p.user_name = any (''' || _vals || ''')
			) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN query execute _query_combine;
 	end
$function$
;
