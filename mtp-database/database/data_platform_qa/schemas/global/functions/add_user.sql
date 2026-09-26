--liquibase formatted sql
--changeset srishti.kumari:MTP-73791 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73791
--comment: setting user_code to max(user_code) in case of manual entry to table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_user(input jsonb, integer, integer);
CREATE OR REPLACE FUNCTION global.add_user(input jsonb, integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_query text;
	_keys text[] := array['created_by','updated_by']::text[];
	_vals text[] := array[$2,$3]::text[];
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'user_name' then
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			elseif _key = 'email_id' then
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		execute 'INSERT INTO "global".user_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ';';
	end
$function$
;

DROP FUNCTION IF EXISTS global.add_user(input jsonb);
CREATE OR REPLACE FUNCTION global.add_user(input jsonb)
 RETURNS TABLE(email character varying, user_code integer, user_name character varying)
 LANGUAGE plpgsql
AS $function$
declare 
  _query_combine text := '';
  	_keys text[] ;
   	_vals text[] ;
  	_key text;
  	_value text;
  	_query text;
  	_query_check text;
  	_user_name text;
  	_user_id text;
  	_attribute_value text;
  	_cnt integer:=0;
  	_result_name text;
  	_result_id text;
  	_update_query text :='';
  	_insert_query  text ;
  	_attribute_ary  text[] ;
  	_input_json json ;
  	_custom_key text ;
  	_custom_value text ;
  	_custom_keys text[] ;
  	_custom_values text[] ;
  	_user_code text;
  	_insert_user_attributes_query text;
  	_update_attributes_query text;
  	_attribute_name text;
  	_emails text[];
  	_return_query text;
  begin
	
	PERFORM setval('global.user_master_user_code_seq', (SELECT MAX(global.user_master.user_code) FROM global.user_master));	

  	for _input_json in select json_array_elements(value::json) input_json from 
  			(select value from jsonb_each_text($1::jsonb)) x
  	 loop	
  		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
  		loop 
  	
  		if 	_key ='user_name' then 
  		_user_name=_value;
  		_keys := array_append(_keys, 'name');
  		_vals := array_append(_vals, '''' || _value || '''');
  		_keys := array_append(_keys, _key);
  		_vals := array_append(_vals, '''' || _value || '''');
  		elsif _key ='email' then 
  		_user_id = lower(_value);
  		_keys := array_append(_keys, _key);
  		_vals := array_append(_vals, '''' || lower(_value) || '''');
  		_emails := array_append(_emails, '''' || lower(_value) || '''');
  		elsif _key = 'custom_attributes' then
  		_custom_keys := array_append(_custom_keys,'attribute_name');
  		_custom_values := array_append(_custom_values ,  '''' || coalesce (_key ,'')|| '''');
  		_custom_keys := array_append(_custom_keys,'attribute_value');
  		_custom_values := array_append(_custom_values ,  '''' || coalesce (_value::varchar,'')|| '''');
  		_custom_keys := array_append(_custom_keys,'datatype');
  		_custom_values := array_append(_custom_values , quote_literal('json')); 
  		else
  			_keys := array_append(_keys, _key);
  		    _vals  := array_append(_vals, '''' || coalesce (_value ,'')|| '''');
  		end if;
  		end loop;
  
  	_query_check:= 'select count(*) from global.user_master um where um.email = '''||_user_id||'''';
  
  	 begin
  	  raise notice '%', _query_check;
  	  execute _query_check into _cnt;
  	  --if _cnt
  	 exception when others then
  	 	raise notice '%', 'Exception '|| _cnt;
  	 end;
  
  	if _cnt>0 then
  	 	_update_query := 'UPDATE "global".user_master SET user_name =  '''||_user_name||''',name='''||_user_name||''' ,updated_at=now() , is_deleted =''false'' WHERE email = lower('''|| _user_id||''') returning user_code'; 
  	  	raise notice '%', _update_query;
  		execute _update_query into _user_code;
  		_update_attributes_query := 'UPDATE "global".user_attributes SET ';
  		if array_length(_custom_keys,1) > 0 then
  		for i IN 1..array_length(_custom_keys, 1) 
 		loop
 		if _custom_keys[i]='attribute_name' then
 		_attribute_name := _custom_values[i];
   		end if;
 		_update_attributes_query := _update_attributes_query || _custom_keys[i] || ' = ' || _custom_values[i] ;
   		if i < array_length(_custom_keys, 1) then
     	_update_attributes_query := _update_attributes_query || ', ';
     	end if;
 		end loop;
 		_update_attributes_query := _update_attributes_query || ' WHERE user_code = ' || _user_code || ' AND attribute_name = ' || _attribute_name;
 		execute _update_attributes_query;
 		end if;
 	else
  	_insert_query := 'insert into  "global".user_master ('|| (ARRAY_TO_STRING(_keys, ', ', '')) ||')  values ('|| (ARRAY_TO_STRING(_vals, ', ', '')) ||') returning user_code::text';
  	raise notice '%', _insert_query;
  	execute _insert_query into _user_code;
     if array_length(_custom_keys,1) > 0 then
  	_custom_keys = array_append(_custom_keys,'user_code');
  	_custom_values = array_append(_custom_values ,_user_code);
     _insert_user_attributes_query := 'insert into  "global".user_attributes ('|| (ARRAY_TO_STRING(_custom_keys, ', ', '')) ||')  values ('|| (ARRAY_TO_STRING(_custom_values, ', ', '')) ||') '	;
  	raise notice '%', _insert_user_attributes_query;
  	execute _insert_user_attributes_query;
  	end if;
  	end if;
  	_keys  := null;
  	_vals  := null;
  	_custom_keys := null;
  	_custom_values := null;
  	end loop;
 	raise notice ' emails % ', _emails;
 	_return_query := 'select email, user_code, name as user_name from "global".user_master where email in (' || (ARRAY_TO_STRING(_emails, ', ', '')) || ')'; 
 	raise notice ' return query %', _return_query;
 	return query execute(_return_query);
 	end
 $function$
;