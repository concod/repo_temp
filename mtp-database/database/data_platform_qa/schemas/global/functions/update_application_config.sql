--liquibase formatted sql
--changeset liquibase:update_application_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_application_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_application_config(input character varying, jsonb);
CREATE OR REPLACE FUNCTION global.update_application_config(input character varying, jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*	
 * Function/Procedure name: global.update_application_config
 * Created by: Kailash Yadav
 * Created at: 15-Dec-2021
 * No of input parameter: 2
 * Parameter Description : $1 = Application name
 * 						   $2 = JSON for attribute details 	
 * Purpose: This function been created to insert given attribute value in attribute_master if not found, 
 *  if same attribute found in attribute_master then update the and update the same attribute_code in applicatiom_master 
 * Calling Statement: 	
 * 	select * from global.update_application_config
	( 'ASSORT',
	'{"attribute": [
	    {
	      "attribute_name": "planning_hierarchy",
	      "attribute_value": {"value":"l1_name","value":"l2_name"},
	      "attribute_type": "APPLICATION",
	      "status": true,
	      "description": "planning hierarchy"
	    }
	  ]}')
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by 		Updated_on 		Purpose
 * ----------		-----------		--------
 * Kailash Yadav	15-Dec-2021: 	To resolve the update issue in application master.attribute_code 	
 */
declare 
_query_combine text := '';
	_keys text[] ;
 	_vals text[] ;
	_key text;
	_value text;
	_key1 text;
	_value1 text;
	_query text;
	_query_check text;
	_attribute_type text;
	_attribute_name text;
	_attribute_value text;
	_cnt integer:=0;
	_attr_cnt integer:=0;
	_attribute_code integer;
	_update_query text :='';
	_insert_query  text ;
	_attribute_ary  text[] ;
	_input_json json ;
	_attrbute_array_len Integer; 
	

begin
		
	for _input_json in select json_array_elements(value::json) input_json from 
			(select value from jsonb_each_text($2::jsonb)) x
	 loop	
		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
		loop 
	
		if 	_key ='attribute_type' then 
		_attribute_type = _value ;
	   
	
		---_attribute_ary := array_append(_attribute_ary, (_key || ' = ''' || _value || ''''));
		_keys := array_append(_keys, _key);
		_vals := array_append(_vals, '''' || _value || '''');
			--raise notice '%',_vals||'-'||_value;
		elsif _key ='attribute_name' then 
			_attribute_name = _value ;
		--_attribute_ary := array_append(_attribute_ary, (_key || ' = ''' || _value || ''''));
		--raise notice '%',_attribute_ary;
		_keys := array_append(_keys, _key);
		_vals := array_append(_vals, '''' || _value || '''');
		elsif _key ='attribute_value' then 
			_attribute_value =  ''''||_value||'''';
			for _key1, _value1 in SELECT * FROM json_each_text(_value::json)  loop 
			_attribute_value = _value1;
		  end loop;
		_keys := array_append(_keys, _key);
		_vals := array_append(_vals, '''' || _value || '''');
		--_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			_attribute_ary := array_append(_attribute_ary, (_key || ' = ''' || _value || ''''));
			
		else
			_keys := array_append(_keys, _key);
		    _vals  := array_append(_vals, '''' || coalesce (_value ,'')|| '''');
		end if;
	
		end loop;
	--_attrbute_array_len:= array_length(_attribute_ary::array,1);
	
  _query_check:= 'select count(*) ,attribute_code  from global.attributes_master am2 where attribute_type = '''||_attribute_type ||''' and name ='''||_attribute_name||''' and attribute_value->>''value'' = '''||_attribute_value||''' group by attribute_code';
 
	
	 begin 	
	  execute _query_check into _cnt, _attribute_code;
	  --if _cnt 
	 exception when others then
	 	raise notice '%', 'Exception '|| _cnt;
	 end;
		 
	if _cnt>0 then
	 	-- raise notice '%', 'Count : '|| _attribute_code;
	 	
	 	--_application := array_append(_application,$1);
	 	-- raise notice '%',$1;
	 	
	 	_query_check := 'select count(1)  from "global".application_master where '||
	 				'NAME = (upper('''|| $1||'''))
					and '||_attribute_code || ' = any(attribute_code)'; 

		
		execute _query_check into  _attr_cnt	;
		 --raise notice '%',_query_check; 	
	 	
	 	if _attr_cnt >0 then  
	 		null;
	 	 raise notice '%',_attr_cnt;
	 	
	 	else
	 	-- _update_query := 'UPDATE "global".application_master SET attribute_code =  ''{'||concat(_attribute_code)||'}'' WHERE NAME =  any (upper(''' ||concat( $1) || ''')::varchar[])';
	 	 _update_query := 'UPDATE "global".application_master SET attribute_code =  array_append (attribute_code,'||_attribute_code|| ') WHERE NAME = (upper('''|| $1||'''))';
	     raise notice '%', _update_query;
	     execute _update_query; 
	    end if;
	else
	 
	
	_insert_query := 'insert into  "global".attributes_master (status, description, name, attribute_type, attribute_value)  values ('|| (ARRAY_TO_STRING(_vals, ', ', '')) ||') returning attribute_code;'	;  
	raise notice '%', _insert_query;
	
	   execute _insert_query into _attribute_code ;
	 	--_update_query := 'UPDATE "global".application_master SET attribute_code =  attribute_code||''{'||concat(_attribute_code)||'}'' WHERE NAME =  any (upper(''' ||concat( $1) || ''')::varchar[])';
	   _update_query := 'UPDATE "global".application_master SET attribute_code =  array_append (attribute_code,'||_attribute_code|| ') WHERE NAME = (upper('''|| $1||'''))';
	     
	  -- raise notice  '%', 'insert '||_update_query;
	   execute _update_query;
	 end if;	
	_keys  := null;
	_vals  := null;
	end loop;
	
	
end
;
$function$
;
