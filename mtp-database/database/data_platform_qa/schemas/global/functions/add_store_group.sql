--liquibase formatted sql
--changeset liquibase:add_store_group runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_store_group
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_group(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_store_group(input jsonb, integer)
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
	_mapping_query text;
	_sg_mapping_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			if _key = 'stores' then
				_stores := _value;
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		_query := 'INSERT INTO "global".store_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning sg_code;';
		execute _query into _sg_code;
		_sg_mapping_query := 'INSERT INTO "global".store_groups_mapping
				(sg_code, store_code, ref_sg_code)
				select
					' || _sg_code || ' as pg_code,
						(s->>''store_code'')::varchar as store_code,
						(s->>''ref_sg_code'')::int as ref_sg_code
					from
						(
						select
							json_array_elements(''' || _stores || '''::json) as s) x';
		execute _sg_mapping_query;
		return query execute ('select ' || _sg_code);
	end $function$
;
