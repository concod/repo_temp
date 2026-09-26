--liquibase formatted sql
--changeset liquibase:add_store_group_all_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_store_group_all_v1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_group_all_v1(jsonb, jsonb, jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_store_group_all_v1(jsonb, jsonb, jsonb, jsonb, jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	
	/*
	
	 * Function/Procedure name: global.add_store_group_all
	 * Created by: Kailash Yadav
	 * Created at: 05-May-2022
	 * No of input parameter: 4
	 * Parameter Description : $1 = JSON to filter main table (store_master)
	 *                         $2 = JSON for filter store_attributes
	                           $3 = JSON for product master filters
	                           $4 = JSON for product attribute filters
	 * 						   $5 = JSON for store group values and store_code key will be used to skip the store code.
	 * 						   $6 = created by user code
	 * Purpose: This function been created to insert data into store_groups and store_groups_mapping table for select all store. 
	 * we can pass the skip store code value in $5 store_code key
	 * Calling Statement:   
	 *  select * from	global.add_store_group_all_v1('{}',
	  '{"channel": [{"type": "list", "operator": "in", "values": ["Full Line Retail"]}],
		"region": [{"type": "list", "operator": "in", "values": ["Allen", "Annapolis", "Ann Arbor"]}]}',
		'{"name": "sg-test-0078", "special_classification": "manual"
		, "store_group_ids":[36,135], "exclude_stores": [12]}',
		3 )
	 * 
	 * if any modification done in same function/procedure please record the changes in below format
	 * 
	 * Updated_by       Updated_on      Purpose
	 * ----------       -----------     --------
	 * Kailash Yadav    15-Dec-2021:    To resolve the update issue in application master.attribute_code
	 * Pradeep Nayak	19-May-2022		Code to handle store group ids    
	 */
		 
		declare
		_key text;
		_value text;
		_keys text[] := array['created_by']::text[];
		_vals text[] := array[$6]::text[];
		_query text;
		_stores json;
		_sg_code int;
		_exclude_stores text[];
		_ref_sg_codes text[];
		_ref_sg_code int;
		_mapping_query text;
		_sg_mapping_query text;
	
		_query_sm text := '';
		_query_sa text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_where text := ' where 1=1 ';
		_where1 text := '';
		begin
		for _key, _value in SELECT * FROM jsonb_each_text($5) WHERE value IS NOT NULL loop
				if _key = 'exclude_store_ids' then
					_exclude_stores := replace(replace(_value,'[','{'),']','}')::text[];
				elseif _key = 'store_group_ids' then
					_ref_sg_codes :=  replace(replace(_value,'[','{'),']','}')::text[];
				else
					_keys := array_append(_keys, _key);
					_vals := array_append(_vals, '''' || _value || '''');
				end if;
			end loop;
			
			raise notice '_exclude_stores % ',_exclude_stores;
			
			_query := 'INSERT INTO "global".store_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning sg_code;';
			raise notice '_query %',_query;
			execute _query into _sg_code;
	
		   if cardinality(_exclude_stores) > 0 then
				--_where:= _where || 'and X.store_code not in ('||array_to_string(_exclude_stores,',','*')||')';
			   _where:= _where || 'and not (X.store_code = any ('''|| concat(_exclude_stores)||'''::text[]))';
		   end if;
			raise notice ' _where clause : %',_where;
		 	_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
					(sg_code, store_code, ref_sg_code)
					(SELECT distinct ' || _sg_code || ' as sg_code,  X.store_code,   null::int as "ref_sg_code"   FROM (
				select
					sm.store_code
				from
					(' || global.store_group_form_filter_query($1, $2, $3, $4) || ' ) sm
				) X 			
				 '||_where ||')';
			raise notice 'filter insert query %',_sg_mapping_query;
			execute _sg_mapping_query;
			
	
		  if cardinality(_ref_sg_codes) > 0 then 
			_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
					(sg_code, store_code, ref_sg_code)
					( select ' || _sg_code || ' as sg_code, sgm.store_code, sgm.sg_code as ref_sg_code 
						from "global".store_groups_mapping sgm where sgm.sg_code = any ('''|| concat(_ref_sg_codes)||''')
	                 ) ON conflict do nothing;
				   ';
			raise notice 'store group insert query %',_sg_mapping_query;
			execute _sg_mapping_query;
		 end if;
		return query execute ('select ' || _sg_code);
		end;
	$function$
;
