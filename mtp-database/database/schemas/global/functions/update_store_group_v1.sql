--liquibase formatted sql
--changeset liquibase:update_store_group_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_store_group_v1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_store_group_v1(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_store_group_v1(input integer, jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
/*
*  Updates store group.
    *Author: Pradeep Nayak
    *Updates from prev version :
    *    preparing store ids from query, instead of passing in params
    * Calling Statement:
    * select * from global.update_store_group_v1(147, '{
	*									   "add_ids": ["4072"],
	*									   "remove_ids": ["4071"],
	*									   "remove_group_ids": [141],
	*									   "add_group_ids": [141]
	*									   }', 1)
*/
	declare
	_key text;
	_value text;
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_query text;
	_stores json;
	_sg_code int;
	_sg_mapping_query text;
	_sg_mapping_cleanup_query text;
	_delete_where_query text := 'where sg_code = ' || $1 || ' ';
	add_ids json;
	-- remove_ids is text and not array, double quotes missing after converting to array
	remove_ids text := '()';
	add_group_ids json;
	add_group_ids_arr text[];
	remove_group_ids text[];

	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
			if _key = 'add_ids' then
				add_ids := _value;
			elsif _key = 'add_group_ids' then
				add_group_ids := _value;
			elsif _key = 'remove_ids' then
				raise notice ' remove ids %', _value;
				remove_ids := replace(replace(replace(_value,'[','('),']',')'), '"', '''');
			elsif _key = 'remove_group_ids' then
				remove_group_ids := replace(replace(_value,'[','{'),']','}');
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		raise notice ' remove_ids %', remove_ids;
		if remove_ids != '()' and remove_group_ids != '{}' then
			_delete_where_query := _delete_where_query || ' and ( store_code in ' || remove_ids || ' or ref_sg_code in ('||array_to_string(remove_group_ids,',','*') ||')) ';
		elseif remove_ids != '()' then
			_delete_where_query := _delete_where_query || ' and store_code in '||remove_ids||' ';
		elseif remove_group_ids != '{}' then
			_delete_where_query := _delete_where_query || ' and ref_sg_code in ('||array_to_string(remove_group_ids,',','*') ||')';
		else
			_delete_where_query := '';
		end if;
		_query := 'update "global".store_groups SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where sg_code = ' || $1 || ';';
		execute _query;
		if _delete_where_query != '' then
			_sg_mapping_cleanup_query := 'delete from "global".store_groups_mapping ' ||_delete_where_query|| ';';
			raise notice ' _sg_mapping_cleanup_query % ', _sg_mapping_cleanup_query;
			execute _sg_mapping_cleanup_query;
		end if;
		if jsonb_array_length( add_ids::jsonb ) != 0 then
			_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
					(sg_code, store_code, ref_sg_code)
					(select
						' || $1 || ' as sg_code,
							x.store_code::varchar as store_code,
							null as ref_sg_code
						from
							(
							select trim(''"'' FROM s::text) as store_code from 
								json_array_elements(''' || add_ids || '''::json) as s) x
								)ON conflict do nothing;';
			execute _sg_mapping_query;
			raise notice ' _sg_mapping_query % ', _sg_mapping_query;
		end if;
		if jsonb_array_length( add_group_ids::jsonb) > 0 then
			add_group_ids_arr	:= replace(replace(add_group_ids::text,'[','{'),']','}')::text[];
			_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
				(sg_code, store_code, ref_sg_code)
				(select 
					' || $1 || ' as sg_code,
					sgm.store_code::varchar as store_code,
					sgm.sg_code::int as ref_sg_code
				from 
					(
						select sg_code::int as sg_code, store_code::varchar as store_code
						from "global".store_groups_mapping where sg_code in ('||array_to_string(add_group_ids_arr,',','*')||')
					) sgm
					) ON conflict do nothing;
			';
			raise notice ' sub group insertion query %', _sg_mapping_query;
			execute _sg_mapping_query;
		end if;
	end $function$
;
