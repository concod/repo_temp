--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:mojo-49342973 runOnChange:true stripComments:false splitStatements:false context:mojo-49342973 labels:mojo-49342973
--comment: logic to get sg_code for non deleted store groups
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_group_v1(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_store_group_v1(input jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_keys text[] := array['created_by', 'updated_by']::text[];
	_vals text[] := array[$2, $2]::text[];
	_query text;
	_stores json;
	_sg_code int;
	_ref_sg_codes text[];
	_mapping_query text;
	_sg_mapping_query text;
	_store_group_name text;
	_source_ui bool := false;
	_set_upload_flag bool := false;
	_extra_value text;
	_extra_value_json jsonb := '{}';
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			if _key = 'name' then
				_store_group_name := _value;
			end if;
			if _key = 'stores' then
				_stores := _value;
			elsif _key = 'source_ui' then
				_source_ui := _value;
			elsif _key = 'set_upload_flag' then
				_set_upload_flag := _value;
			elsif _key = 'store_group_ids' then
				_ref_sg_codes :=  replace(replace(_value,'[','{'),']','}')::text[];
			elsif _key = 'extra' then
				_extra_value_json := _value;
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;

		raise notice 'Values are: %', _store_group_name;

		_query := 'select sg_code from "global".store_groups where name=' || '''' || _store_group_name|| '''' || ' and is_deleted = false';
		execute _query into _sg_code;

		if _set_upload_flag = true and _source_ui = false then
			_extra_value = (_extra_value_json || '{"is_uploaded": "TRUE"}' :: jsonb) ::text;
		elsif _set_upload_flag = true and _source_ui = true then
			_extra_value = (_extra_value_json || '{"is_uploaded": "FALSE"}' :: jsonb) ::text;
		else
			_extra_value = _extra_value_json :: text;
		end if;

		if _source_ui = true or _sg_code is NULL then
			_keys := array_append(_keys, 'extra');
			_vals := array_append(_vals, '''' || _extra_value || '''');
			_query := 'INSERT INTO "global".store_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning sg_code;';
			execute _query into _sg_code;
		else
			if _set_upload_flag = true then
				_query := 'update  "global".store_groups set updated_by=' || $2 || ', updated_at = now(), is_deleted = false, channel = ''' || $1 || '''::jsonb->>''channel'',  extra='|| '''' || _extra_value || ''''|| ' where sg_code=' || _sg_code;
			else
				_query := 'update  "global".store_groups set updated_by=' || $2 || ', updated_at = now(), is_deleted = false, channel = ''' || $1 || '''::jsonb->>''channel'' where sg_code=' || _sg_code;
			end if;
			execute _query;
			_query := 'delete from "global".store_groups_mapping where sg_code='||_sg_code;
			raise notice 'delete query is: %', _query;
			execute _query;
		end if;

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

--changeset namratha.da@impactanalytics.co:add_store_group_v1 runOnChange:true stripComments:false splitStatements:false context:mtp-107967 labels:MTP-107967
--comment: removed updated_by key and values
DROP FUNCTION IF EXISTS global.add_store_group_v1(input jsonb, integer, boolean);
CREATE OR REPLACE FUNCTION global.add_store_group_v1(input jsonb, integer, boolean)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$2]::text[];
	_query text;
	_stores json;
	_sg_code int;
	_ref_sg_codes text[];
	_mapping_query text;
	_sg_mapping_query text;
	_sg_mapping_insert_query text;
	_sg_mapping_from_query text;
	_mapping_table text;
    _psa_flag boolean := $3;
   	_store_group_name text;
   	_source_ui bool := false;
	_set_upload_flag bool := false;
	_extra_value text;
	_extra_value_json jsonb := '{}';
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			if _key = 'name' then
				_store_group_name := _value;
			end if;
		
			if _key = 'stores' then
				_stores := _value;
			elsif _key = 'source_ui' then
				_source_ui := _value;
			elsif _key = 'set_upload_flag' then
				_set_upload_flag := _value;
			elsif _key = 'store_group_ids' then
				_ref_sg_codes :=  replace(replace(_value,'[','{'),']','}')::text[];
			elsif _key = 'extra' then
				_extra_value_json := _value;
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
	
		raise notice 'Values are: %-%', _store_group_name, _source_ui;
	
		_query := 'select sg_code from "global".store_groups where name=' || '''' || _store_group_name|| '''' || ' and is_deleted = false';
		execute _query into _sg_code;
	
		if _set_upload_flag = true and _source_ui = false then
			_extra_value = (_extra_value_json || '{"is_uploaded": "TRUE"}' :: jsonb) ::text;
		elsif _set_upload_flag = true and _source_ui = true then
			_extra_value =  (_extra_value_json || '{"is_uploaded": "FALSE"}' :: jsonb) ::text;
		else
			_extra_value = _extra_value_json :: text;
		end if;

		if _psa_flag = true then
			_mapping_table := '"global".aggregated_store_groups_mapping';
		else
			_mapping_table := '"global".store_groups_mapping';
		end if;
	
		if _source_ui = true or _sg_code is NULL then
			_keys := array_append(_keys, 'extra');
			_vals := array_append(_vals, '''' || _extra_value || '''');
            _query := 'INSERT INTO "global".store_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning sg_code;';
            execute _query into _sg_code;
        else
			if _set_upload_flag = true then
				_query := 'update  "global".store_groups set updated_by=' || $2 || ', updated_at = now(), is_deleted = false, channel = ''' || $1 || '''::jsonb->>''channel'',  extra='|| '''' || _extra_value || ''''|| ' where sg_code=' || _sg_code;
			else
				_query := 'update  "global".store_groups set updated_by=' || $2 || ', updated_at = now(), is_deleted = false, channel = ''' || $1 || '''::jsonb->>''channel'' where sg_code=' || _sg_code;
			end if;
			
			execute _query;
            _query := 'delete from ' || _mapping_table || ' where sg_code='||_sg_code;
            raise notice 'delete query is: %', _query;
            execute _query;
        end if;
       
	    if _psa_flag = true then
	    	_mapping_table := '"global".aggregated_store_groups_mapping';
	    	_sg_mapping_insert_query := 'INSERT INTO ' || _mapping_table ||' 
											(sg_code, psa_code, store_count)
											select
												' || _sg_code || ' as sg_code,
													(s->>''psa_code'')::varchar as psa_code,
													(s->>''store_count'')::integer as store_count';
		else
			_mapping_table := '"global".store_groups_mapping';
			_sg_mapping_insert_query := 'INSERT INTO ' || _mapping_table ||' 
											(sg_code, store_code)
											select
												' || _sg_code || ' as sg_code,
													(s->>''store_code'')::varchar as store_code';
		end if;
		_sg_mapping_from_query := 'select
							json_array_elements(''' || _stores || '''::json) as s';
						
	    _sg_mapping_query := _sg_mapping_insert_query || ' from ( ' || _sg_mapping_from_query || ' ) x';
		execute _sg_mapping_query;	  
		if _ref_sg_codes::text != '{}' then 
			if _psa_flag = true then
				_sg_mapping_query := 'INSERT INTO "global".aggregated_store_groups_mapping
					(sg_code, psa_code, store_count)
					( select ' || _sg_code || ' as sg_code, asgm.psa_code as psa_code, asgm.store_count as store_count
						from "global".aggregated_store_groups_mapping asgm where asgm.sg_code in ('||array_to_string(_ref_sg_codes,',','*')||')
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
