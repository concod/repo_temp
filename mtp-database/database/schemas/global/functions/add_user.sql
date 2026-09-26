--liquibase formatted sql
--changeset mayank.mukundam:MTP-89538 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-89538
--comment: reverting the changes to previous return type as create API breaking
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


--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:MTP-118205 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-118205
--comment: preventing SQLi
--rollback: SELECT 1
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
	_duplicates text[];
	_result jsonb;
	_cols_list text;
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
				_vals := array_append(_vals, quote_nullable(_value));
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, quote_nullable(_value));
			elsif _key ='email' then 
				_user_id = lower(_value);
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, quote_nullable(lower(_value)));
				_emails := array_append(_emails, lower(_value));
	  		elsif _key = 'custom_attributes' then
				_custom_keys := array_append(_custom_keys,'attribute_name');
				_custom_values := array_append(_custom_values, quote_nullable(_key));
				_custom_keys := array_append(_custom_keys,'attribute_value');
				_custom_values := array_append(_custom_values, quote_nullable(_value::varchar));
				_custom_keys := array_append(_custom_keys,'datatype');
				_custom_values := array_append(_custom_values, quote_literal('json')); 
	  		else
	  			_keys := array_append(_keys, _key);
	  		    _vals  := array_append(_vals, quote_nullable(_value));
	  		end if;
  		end loop;
  
  	-- Use parameterized query to check for existing user
  	_cnt := 0;
  	 begin
  	  execute 'SELECT count(*) FROM global.user_master WHERE email = $1' into _cnt using _user_id;
  	 exception when others then
  	 	raise notice 'Exception checking user: %', SQLERRM;
  	 end;
  
  	if _cnt>0 then
  		-- User exists, update it using parameterized query
  	  	execute 'UPDATE global.user_master SET user_name = $1, name = $1, updated_at = now(), is_deleted = false WHERE email = lower($2) RETURNING user_code' 
  	  		into _user_code using _user_name, _user_id;
  	  	raise notice 'Updated user_code: %', _user_code;
		_duplicates := array_append(_duplicates, _user_code);
		
  		-- Update custom attributes if present
  		if array_length(_custom_keys,1) > 0 then
  			_update_attributes_query := 'UPDATE global.user_attributes SET ';
  			for i IN 1..array_length(_custom_keys, 1) 
 			loop
	 			if _custom_keys[i]='attribute_name' then
	 				_attribute_name := _custom_values[i];
	   			end if;
	 			_update_attributes_query := _update_attributes_query || quote_ident(_custom_keys[i]) || ' = ' || _custom_values[i];
	   			if i < array_length(_custom_keys, 1) then
	     			_update_attributes_query := _update_attributes_query || ', ';
	     		end if;
 			end loop;
 			_update_attributes_query := _update_attributes_query || ' WHERE user_code = ' || quote_literal(_user_code) || ' AND attribute_name = ' || _attribute_name;
 			raise notice 'Update attributes query: %', _update_attributes_query;
 			execute _update_attributes_query;
 		end if;
 	else
 		-- User doesn't exist, insert new user
 		-- Build column list with proper identifier quoting
 		_cols_list := (
 			SELECT string_agg(quote_ident(col), ', ')
 			FROM unnest(_keys) AS col
 		);
 		
  		_insert_query := format(
  			'INSERT INTO global.user_master (%s) VALUES (%s) RETURNING user_code::text',
  			_cols_list,
  			array_to_string(_vals, ', ')
  		);
  		raise notice 'Insert query: %', _insert_query;
  		execute _insert_query into _user_code;
  		
  		-- Insert custom attributes if present
	    if array_length(_custom_keys,1) > 0 then
	  		_custom_keys = array_append(_custom_keys,'user_code');
	  		_custom_values = array_append(_custom_values, quote_literal(_user_code));
	  		
	  		-- Build column list with proper identifier quoting
	  		_cols_list := (
	  			SELECT string_agg(quote_ident(col), ', ')
	  			FROM unnest(_custom_keys) AS col
	  		);
	  		
	     	_insert_user_attributes_query := format(
	     		'INSERT INTO global.user_attributes (%s) VALUES (%s)',
	     		_cols_list,
	     		array_to_string(_custom_values, ', ')
	     	);
	  		raise notice 'Insert attributes query: %', _insert_user_attributes_query;
	  		execute _insert_user_attributes_query;
	  	end if;
  	end if;
  	_keys  := null;
  	_vals  := null;
  	_custom_keys := null;
  	_custom_values := null;
  	end loop;
  	
 	raise notice 'Emails: %', _emails;
 	
 	-- Return the created/updated users using parameterized query
 	if array_length(_emails, 1) > 0 then
 		_return_query := format(
 			'SELECT email, user_code, name AS user_name FROM global.user_master WHERE email = ANY($1)'
 		);
 		raise notice 'Return query: %', _return_query;
 		return query execute _return_query using _emails;
 	end if;
 	end
 $function$
;