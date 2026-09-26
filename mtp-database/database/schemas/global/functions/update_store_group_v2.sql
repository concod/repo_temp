--liquibase formatted sql
--changeset liquibase:update_store_group_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_store_group_v2
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_store_group_v2(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_store_group_v2(input integer, jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	--_keys text[] := array['created_by']::text[];
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_query text;
	_stores json;
	_sg_code int;
	_ref_sg_codes text[];
	_mapping_query text;
	_sg_mapping_query text;
	_sg_mapping_cleanup_query text;
	begin
		_sg_code = $1;
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
			if _key = 'stores' then
				_stores := _value;
			elsif _key = 'store_group_ids' then
				_ref_sg_codes :=  replace(replace(_value,'[','{'),']','}')::text[];
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		--_query := 'INSERT INTO "global".store_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning sg_code;';
		--execute _query into _sg_code;
		_query := 'update "global".store_groups SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where sg_code = ' || _sg_code || ';';
		execute _query;
	
		
	
		_sg_mapping_cleanup_query := 'delete from "global".store_groups_mapping where sg_code = ' || _sg_code || ';';
			raise notice ' _sg_mapping_cleanup_query % ', _sg_mapping_cleanup_query;
			execute _sg_mapping_cleanup_query;
		
		_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
				(sg_code, store_code)
				select
					' || _sg_code || ' as sg_code,
						(s->>''store_code'')::varchar as store_code
					from
						(
						select
							json_array_elements(''' || _stores || '''::json) as s) x';
		execute _sg_mapping_query;	  
		if _ref_sg_codes::text != '{}' then 
			_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
				(sg_code, store_code)
				( select ' || _sg_code || ' as sg_code, sgm.store_code
					from "global".store_groups_mapping sgm where sgm.sg_code in ('||array_to_string(_ref_sg_codes,',','*')||')
                 ) ON conflict do nothing;
			   ';
			execute _sg_mapping_query;
			raise notice 'store group insert query %',_sg_mapping_query;
		end if;
		return query execute ('select ' || _sg_code);
		
	end $function$
;

--changeset arnab.nandy@impactanalytics.co:update_store_group_v2_psa_flag runOnChange:true stripComments:false splitStatements:false context:MTP-37094 labels:MTP-37094
--comment: changeset for update_store_group_v2 function for product store dimension and cursor based
DROP FUNCTION IF EXISTS global.update_store_group_v2(input integer, jsonb, integer, boolean);
CREATE OR REPLACE FUNCTION global.update_store_group_v2(input integer, jsonb, integer, boolean)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	--_keys text[] := array['created_by']::text[];
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_query text;
	_stores json;
	_sg_code int;
	_ref_sg_codes text[];
	_mapping_query text;
	_sg_mapping_query text;
	_sg_mapping_cleanup_query text;
    _psa_flag boolean := $4;
    _update_table text := '';
    _mapping_query_insert_clause text := '';
    _mapping_query_from_clause text := '';
	begin
		_sg_code = $1;
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
			if _key = 'stores' then
				_stores := _value;
			elsif _key = 'store_group_ids' then
				_ref_sg_codes :=  replace(replace(_value,'[','{'),']','}')::text[];
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		--_query := 'INSERT INTO "global".store_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning sg_code;';
		--execute _query into _sg_code;
		_query := 'update "global".store_groups SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where sg_code = ' || _sg_code || ';';
		raise notice 'update query %', _query;
		execute _query;
		if _psa_flag = true then
			_update_table := '"global".aggregated_store_groups_mapping';
			_mapping_query_insert_clause := 'INSERT INTO ' || _update_table || ' 
				(sg_code, psa_code, store_count)
				select
					' || _sg_code || ' as sg_code,
						(s->>''psa_code'')::varchar as psa_code,
						(s->>''store_count'')::integer as store_count ';
		else
			_update_table := '"global".store_groups_mapping';
			_mapping_query_insert_clause := 'INSERT INTO ' || _update_table || ' 
				(sg_code, store_code)
				select
					' || _sg_code || ' as sg_code,
						(s->>''store_code'')::varchar as store_code ';
		end if;
		_mapping_query_from_clause := 'select
								json_array_elements(''' || _stores || '''::json) as s';
		_sg_mapping_cleanup_query := 'delete from ' || _update_table || ' where sg_code = ' || _sg_code || ';';
		raise notice ' _sg_mapping_cleanup_query % ', _sg_mapping_cleanup_query;
		execute _sg_mapping_cleanup_query;
		_sg_mapping_query := _mapping_query_insert_clause || '
					from
						( ' || _mapping_query_from_clause || '
						) x';
		raise notice 'insert query %', _sg_mapping_query;
		execute _sg_mapping_query;	  
		if _ref_sg_codes::text != '{}' then 
			if _psa_flag = true then
				_sg_mapping_query := 'INSERT INTO ' || _update_table || '
				(sg_code, psa_code, store_count)
				( select ' || _sg_code || ' as sg_code, asgm.psa_code as psa_code, asgm.store_count store_count
					from ' || _update_table || ' asgm where asgm.sg_code in ('||array_to_string(_ref_sg_codes,',','*')||')
                 ) ON conflict do nothing;
			   ';
			else
				_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
					(sg_code, store_code)
					( select ' || _sg_code || ' as sg_code, sgm.store_code
						from "global".store_groups_mapping sgm where sgm.sg_code in ('||array_to_string(_ref_sg_codes,',','*')||')
	                 ) ON conflict do nothing;
				   ';
			end if;
			execute _sg_mapping_query;
			raise notice 'store group insert query %',_sg_mapping_query;
		end if;
		return query execute ('select ' || _sg_code);
		
	end $function$
;
