--liquibase formatted sql
--changeset liquibase:add_dc_fc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_dc_fc_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_dc_fc_mapping(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_dc_fc_mapping(input jsonb, integer)
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
	_maps int[];
	_unmaps int[];
	_maps_con text[];
	_unmaps_con text[];
	_map_sql text;
	_unmap_sql text;
	begin
		for _row in select json_array_elements(value::json) from (select value from jsonb_each_text($1)) x loop
			_maps := replace(replace((((_row->>'dc')::jsonb)->>'map'), '[', '{'), ']', '}')::int[];
			_unmaps := replace(replace((((_row->>'dc')::jsonb)->>'unmap'), '[', '{'), ']', '}')::int[];
			if cardinality(_unmaps) > 0 THEN
				FOREACH _unmap in array _unmaps loop
					_unmaps_con := array_append(_unmaps_con, ('(fc_code = ''' || (_row->>'fc_code') || ''' and dc_code = ' || _unmap || ')'));
				end loop;
			end if;
			if cardinality(_maps) > 0 THEN
				FOREACH _map in array _maps loop
					_maps_con := array_append(_maps_con, ('(''dc_fc'', ''' || (_row->>'fc_code') || ''', ' || _map || ')'));
				end loop;
			end if;
		end loop;
		if cardinality(_unmaps_con) > 0 then
			_unmap_sql := 'delete from "global".product_mapping where mapping_type = ''dc_fc'' AND (' || (ARRAY_TO_STRING(_unmaps_con, ' OR ', '')) || ')';
			execute _unmap_sql;
		end if;
		if cardinality(_maps_con) > 0 then
			_map_sql := 'INSERT INTO "global".product_mapping (mapping_type, fc_code, dc_code) VALUES ' || (ARRAY_TO_STRING(_maps_con, ', ', ''))  || ' ON CONFLICT DO NOTHING;';
			execute _map_sql;
		end if;
--		raise notice '%,%',_unmap_sql,_map_sql;
	end 
$function$
;
