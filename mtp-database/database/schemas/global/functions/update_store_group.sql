--liquibase formatted sql
--changeset liquibase:update_store_group runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_store_group
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_store_group(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_store_group(input integer, jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_query text;
	_stores json;
	_sg_code int;
	_sg_mapping_query text;
	_sg_mapping_cleanup_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
			if _key = 'stores' then
				_stores := _value;
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		_query := 'update "global".store_groups SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where sg_code = ' || $1 || ';';
		execute _query;
		_sg_mapping_cleanup_query := 'delete from "global".store_groups_mapping where sg_code = ' || $1 || ';';
		execute _sg_mapping_cleanup_query;
		_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
				(sg_code, store_code, ref_sg_code)
				select
					' || $1 || ' as sg_code,
						(s->>''store_code'')::varchar as store_code,
						(s->>''ref_sg_code'')::int as ref_sg_code
					from
						(
						select
							json_array_elements(''' || _stores || '''::json) as s) x';
		execute _sg_mapping_query;
	end $function$
;
