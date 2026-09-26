--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:MTP-57272-product_dc runOnChange:true stripComments:false splitStatements:false context:MTP-57272 labels:MTP-57272
--comment:  Updating created_at, created_by on insert
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_product_dc_mapping(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_product_dc_mapping(input jsonb, integer)
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
	_update_maps_con text[];
	_map_sql text;
    _update_map_sql text;
	_unmap_sql text;
	begin
		for _row in select json_array_elements(value::json) from (select value from jsonb_each_text($1)) x loop
			_maps := replace(replace((((_row->>'dc')::jsonb)->>'map'), '[', '{'), ']', '}')::text[];
			_unmaps := replace(replace((((_row->>'dc')::jsonb)->>'unmap'), '[', '{'), ']', '}')::text[];
			FOREACH _unmap in array _unmaps loop
				_unmaps_con := array_append(_unmaps_con, ('(product_code = ''' || (_row->>'product_code') || ''' and dc_code = ' || _unmap || ')'));
			end loop;
			FOREACH _map in array _maps loop
				_maps_con := array_append(_maps_con, ('(''product_dc'', ''' || (_row->>'product_code') || ''', ' || _map || ', now(), ' || $2 || ')'));
				_update_maps_con := array_append(_update_maps_con, ('(product_code = ''' || (_row->>'product_code') || ''' and dc_code = ' || _map || ')'));
			end loop;
		end loop;
		if cardinality(_unmaps_con) > 0 then
			_unmap_sql := 'update "global".product_mapping set is_active=false, updated_at = now(), updated_by = ' || $2 || ' where mapping_type = ''product_dc'' AND (' || (ARRAY_TO_STRING(_unmaps_con, ' OR ', '')) || ')';
			execute _unmap_sql;
		end if;
		if cardinality(_maps_con) > 0 then
			_map_sql := 'INSERT INTO "global".product_mapping (mapping_type, product_code, dc_code, created_at, created_by) VALUES ' || (ARRAY_TO_STRING(_maps_con, ', ', '')) || ' ON CONFLICT (product_code,dc_code,mapping_type) DO UPDATE SET is_active = true, updated_at = now(), updated_by = ' || $2 || ';' ;
			execute _map_sql;
		end if;
		raise notice '%,%',_unmap_sql,_map_sql;
	end 
$function$
;
