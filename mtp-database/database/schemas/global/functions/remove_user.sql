--liquibase formatted sql
--changeset liquibase:remove_user runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-118205
--comment: refactor to use query parameters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_user(input jsonb);
CREATE OR REPLACE FUNCTION global.remove_user(input jsonb)
 RETURNS void
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
	_delete_query text :='';
	_insert_query  text ;
	_attribute_ary  text[] ;
	_input_json json ;
	_user_code int;
	_delete_uahm text :='';

begin
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
		_user_id = _value;
		_keys := array_append(_keys, _key);
		_vals := array_append(_vals, '''' || _value || '''');
		else
			_keys := array_append(_keys, _key);
		    _vals  := array_append(_vals, '''' || coalesce (_value ,'')|| '''');
		end if;
		end loop;

 	_query_check:= 'select count(*),user_code from global.user_master um where um.email = $1 group by user_code';

	 begin
	  raise notice '%', _query_check;
	  execute _query_check into _cnt,_user_code using _user_id;
	 exception when others then
	 	raise notice '%', 'Exception '|| _cnt;
	 end;

	if _cnt>0 then
	 	 _delete_query := 'UPDATE "global".user_master SET is_deleted=''true'' WHERE email = $1';
	     _delete_uahm := 'DELETE FROM global.user_access_hierarchy_mapping uahm WHERE user_code = $1';

	 	raise notice '%', _delete_query;


		 execute _delete_query using _user_id;
		 execute _delete_uahm using _user_code;
	 end if;
	_keys  := null;
	_vals  := null;
	end loop;


end
;
$function$
;
