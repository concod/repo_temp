--liquibase formatted sql
--changeset liquibase:order_triaging_finalise runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for order_triaging_finalise
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_triaging_finalise(jsonb, jsonb, integer, integer);
CREATE OR REPLACE FUNCTION inventory_smart.order_triaging_finalise(jsonb, jsonb, integer, integer)
 RETURNS TABLE(allocation_code character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_arr text[]:=array[]::text[];
	_vals text[] := array[('status = '|| $3::integer ),('updated_by = ' || $4::integer), ('updated_at = now()')]::text[];
	_input jsonb;
	_attr_key text[];
	_attr_val text[];
	_query text;
	_query_attr text;
	_ret_arr text[];
	_ret_query text;
	begin
		for _input in select * from jsonb_array_elements($1) WHERE value IS NOT NULL
		loop
			if not (array[_input->>'allocation_code']::text[]  <@ _arr) then 
				_arr := array_append(_arr,_input->>'allocation_code'::text);
			end if;
		end loop;
		raise notice ' % ',_arr;
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL 
		loop
           	_attr_key := array_append(_attr_key, ('attribute_name = ''' || _key::text  || ''''));
            _attr_val := array_append(_attr_val, ('attribute_value = ''' || _value::text || ''''));
        end loop;
	    if cardinality(_arr) > 0 then
	    	 execute 'SELECT array_agg(plan_code) FROM "inventory_smart".plan_master where status=2 and is_deleted=false and plan_code in ('''||array_to_string(_arr, ''', ''','')||''')' 
	    	 into _ret_arr;
	    end if;
	   raise notice ' % ',_ret_arr;
	   if cardinality(_ret_arr) > 0 then
			_query:= 'UPDATE "inventory_smart".plan_master SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE plan_code in ('''||array_to_string(_ret_arr, ''', ''','')||''');';
			execute _query;
			--raise notice ' % ',  _query;
			if cardinality(_attr_key) > 0 then
			
				_query_attr:= 'UPDATE "inventory_smart".plan_attributes SET ' || (ARRAY_TO_STRING(_attr_val, ', ', '')) || ' WHERE plan_code in ('''||array_to_string(_ret_arr, ''', ''','')||''') and '||(ARRAY_TO_STRING(_attr_key, ', ', ''))||';';
				execute _query_attr;
				--raise notice ' % ',  _query_attr;
			end if;
		   	
		end if;
	  
	  if cardinality(_ret_arr) > 0 then 
	  	_ret_query:='select allocation_code::varchar from unnest(array['''||array_to_string(_ret_arr, ''', ''','')||''']::text[]) as allocation_code';
	  else
	  	_ret_query:='select ''''::varchar as allocation_code';
	  end if;
	 --raise notice ' % ',  _ret_query;
	 return query execute(_ret_query);
	end	
	$function$
;
