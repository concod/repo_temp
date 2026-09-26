--liquibase formatted sql
--changeset liquibase:order_triaging_autofinalise runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start,MTP-95045
--comment: initial changeset for order_triaging_autofinalise,MTP-95045
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_triaging_autofinalise(jsonb, integer, integer);
CREATE OR REPLACE FUNCTION inventory_smart.order_triaging_autofinalise(jsonb, integer, integer)
 RETURNS TABLE(allocation_code character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_arr text[]:=array[]::text[];
	_vals text[] := array[('status = '|| $2::integer ),('updated_by = ' || $3::integer), ('updated_at = now()')]::text[];
	_input jsonb;
	_attr_key text[];
	_attr_val text[];
	_query_on text;
	_query text;
	_query_attr text;
	_ret_arr text[];
	_ret_query text;
	begin
		_query_on :='with
		est_now as
		(
		select
			current_timestamp at time zone '''|| inventory_smart.get_tenant_timezone() ||''' as curr
		),
		allocation_table as (
		select
		pm.plan_code as allocation_code
		from
		inventory_smart.plan_master pm
		where
		pm.status = 2
		and pm.is_deleted = false
		and (pm.updated_at at time zone '''|| inventory_smart.get_tenant_timezone() ||''' )  between
		
		(case
				when (
				select
					curr::time
				from
					est_now) < ''12:15:00'' then
		(
				select
					curr::date -1
				from
					est_now) + time''17:00''
				else (
				select
					curr::date
				from
					est_now)+ time''11:46''
			end)
		
		and
		
		(case
				when (
				select
					curr::time
				from
					est_now) < ''12:15:00'' then
		(
				select
					curr::date
				from
					est_now) + time''11:45''
				else (
				select
					curr::date
				from
					est_now) + time''16:59''
			end)
		)
		select array_agg(allocation_code) from allocation_table;';
		
		execute _query_on into _ret_arr;
	   	raise notice ' % ',_ret_arr;
	   
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL 
		loop
           	_attr_key := array_append(_attr_key, ('attribute_name = ''' || _key::text  || ''''));
            _attr_val := array_append(_attr_val, ('attribute_value = ''' || _value::text || ''''));
        end loop;
       
	   
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
	 raise notice ' % ',  _ret_query;
	 return query execute(_ret_query);
	end	
	$function$
;
