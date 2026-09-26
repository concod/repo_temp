--liquibase formatted sql
--changeset liquibase:add_store_fc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_store_fc_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_fc_mapping(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_store_fc_mapping(input jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_row jsonb;
	_key text;
	_value text;
	_query text;
	_map text;
	_unmap text;
	_maps text[];
	_unmaps text[];
	_maps_con text[];
	_unmaps_con text[];
	_map_sql text;
	_unmap_sql text;
	begin
		for _row in select json_array_elements(value::json) from (select value from jsonb_each_text($1)) x loop
			_maps := replace(replace((((_row->>'fc')::jsonb)->>'map'), '[', '{'), ']', '}')::text[];
			_unmaps := replace(replace((((_row->>'fc')::jsonb)->>'unmap'), '[', '{'), ']', '}')::text[];
			FOREACH _unmap in array _unmaps loop
				_unmaps_con := array_append(_unmaps_con, ('(store_code = ''' || (_row->>'store_code') || ''' and fc_code = ' || _unmap || ')'));
			end loop;
			FOREACH _map in array _maps loop
				_maps_con := array_append(_maps_con, ('(''store_fc'', ''' || (_row->>'store_code') || ''', ' || _map || ')'));
			end loop;
		end loop;
		if cardinality(_unmaps_con) > 0 then
			_unmap_sql := 'delete from "global".product_mapping where mapping_type = ''store_fc'' AND (' || (ARRAY_TO_STRING(_unmaps_con, ' OR ', '')) || ')';
			execute _unmap_sql;
		end if;
		if cardinality(_maps_con) > 0 then
			_map_sql := 'INSERT INTO "global".product_mapping (mapping_type, store_code, fc_code) VALUES ' || (ARRAY_TO_STRING(_maps_con, ', ', '')) || ' ON CONFLICT DO NOTHING';
			execute _map_sql;
		end if;
		raise notice '%,%',_unmap_sql,_map_sql;
	end 
$function$
;
