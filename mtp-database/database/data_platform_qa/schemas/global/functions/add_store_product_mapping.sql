--liquibase formatted sql
--changeset liquibase:add_store_product_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_store_product_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_product_mapping(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_store_product_mapping(input jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_products json := $1->>'products';
	stores text[] := replace(replace(($1->>'stores'), '[', '{'), ']', '}')::text[];
	store text;
	_row jsonb;
	_key text;
	_value text;
	_map text;
	_maps text[];
	_unmap text;
	_unmaps text[];
	_maps_con text[];
	_unmaps_con text[];
	_map_sql text;
	_unmap_sql text;
	begin
		for _row in select json_array_elements(_products) x loop
			if ((_row->>'map')::bool) then
				if ((_row->>'include_unmapped')::bool) then
					FOREACH store in array stores loop
						_maps_con := array_append(_maps_con, ('(''product_store'', ''' || store || ''', ''' || (_row->>'product_code') || ''')'));
					end loop;
				else
					_maps := replace(replace((_row->>'select'), '[', '{'), ']', '}')::text[];
					FOREACH _map in array _maps loop
						_maps_con := array_append(_maps_con, ('(''product_store'', ''' || _map || ''', ''' || (_row->>'product_code') || ''')'));
					end loop;
					_unmaps := replace(replace((_row->>'unselect'), '[', '{'), ']', '}')::text[];
					FOREACH _unmap in array _unmaps loop
						_unmaps_con := array_append(_unmaps_con, ('(store_code = ''' || _unmap || ''' and product_code = ''' || (_row->>'product_code') || ''')'));
					end loop;
				end if;
			else
				FOREACH store in array stores loop
					_unmaps_con := array_append(_unmaps_con, ('(store_code = ''' || store || ''' and product_code = ''' || (_row->>'product_code') || ''')'));
				end loop;
			end if;
		end loop;
		if cardinality(_unmaps_con) > 0 then
			_unmap_sql := 'delete from "global".product_mapping_product_store where mapping_type = ''product_store'' AND (' || (ARRAY_TO_STRING(_unmaps_con, ' OR ', '')) || ')';
			execute _unmap_sql;
		end if;
		if cardinality(_maps_con) > 0 then
			_map_sql := 'INSERT INTO "global".product_mapping_product_store (mapping_type, store_code, product_code) VALUES ' || (ARRAY_TO_STRING(_maps_con, ', ', '')) || ' ON CONFLICT DO NOTHING';
			execute _map_sql;
		end if;
		raise notice '%,%',_unmap_sql,_map_sql;
	end $function$
;
