--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:MTP_57272-store-dc runOnChange:true stripComments:false splitStatements:false context:MTP_57272 labels:MTP_57272
--comment: added logic to update created_at created_by
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_dc_mapping(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_store_dc_mapping(input jsonb, integer)
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
	_mapping_code integer[];
	_mapping_query text;
	_store_code text;
	_transit_days integer;
	/*
	 
	 Calling Statement: 
	 select * from global.add_store_dc_mapping
		('{"elements": [{"store_code": "0092", "dc": {"map": ["36"], "unmap": ["34"]}}]}', 
		3); 
	 Modified By : Kailash Yadav
	 Purpose: To accomodate the changes for dc_transit_time_mapping.			
	 
	 */
	begin
		for _row in select json_array_elements(value::json) from (select value from jsonb_each_text($1)) x loop
			_maps := replace(replace((((_row->>'dc')::jsonb)->>'map'), '[', '{'), ']', '}')::text[];
			_unmaps := replace(replace((((_row->>'dc')::jsonb)->>'unmap'), '[', '{'), ']', '}')::text[];
			FOREACH _unmap in array _unmaps loop
				_unmaps_con := array_append(_unmaps_con, ('(store_code = ''' || (_row->>'store_code') || ''' and dc_code = ' || _unmap || ')'));
			end loop;
			FOREACH _map in array _maps loop
				_maps_con := array_append(_maps_con, ('(''store_dc'', ''' || (_row->>'store_code') || ''', ' || _map || ', now(), ' || $2 || ')'));
				_update_maps_con := array_append(_update_maps_con, ('(store_code = ''' || (_row->>'store_code') || ''' and dc_code = ' || _map || ')'));
				_store_code :=_row->>'store_code';
			end loop;
		end loop;
	
		raise notice '_store_code%',_store_code;
	
		if cardinality(_unmaps_con) > 0 then
--			_mapping_query :='select array_agg( mapping_code)::int[] from "global".product_mapping where mapping_type = ''store_dc'' AND (' || (ARRAY_TO_STRING(_unmaps_con, ' OR ', '')) || ')' ;
--			raise notice '_mapping_query%',_mapping_query;
--			execute _mapping_query into _mapping_code;
--			raise notice '_mapping_code1%',_mapping_code;
--			delete from "inventory_smart".dc_transit_time_mapping where mapping_code =any  (_mapping_code) ;
			_unmap_sql := 'update "global".product_mapping set is_active=false, updated_at = now(), updated_by = ' || $2 || ' where mapping_type = ''store_dc'' AND (' || (ARRAY_TO_STRING(_unmaps_con, ' OR ', '')) || ')';
			execute _unmap_sql;
			
		end if;
		raise notice '_mapping_code%',_mapping_code;
		if cardinality(_maps_con) > 0 then
			_map_sql := 'INSERT INTO "global".product_mapping_store_dc  (mapping_type, store_code, dc_code, created_at, created_by) VALUES ' || (ARRAY_TO_STRING(_maps_con, ', ', '')) || ' 
			ON CONFLICT (store_code,dc_code) DO UPDATE SET is_active = true, updated_at = now(), updated_by = ' || $2 || ';' ;
			raise notice '_map_sql%',_map_sql;
			execute _map_sql; --into _mapping_code ;
			raise notice '_mapping_code%',_mapping_code;
		 --Removed below code as not sure the mapping 
			/* begin	
				/*select days 
					into _transit_days 
					from public.warehouse_master wm 
					where destination_warehouse_id =_store_code;*/
				-- not sure how will get the mapping so temorary adding _transit_days :=0
				_transit_days :=0;
			
				--raise notice '_mapping_code2%',_mapping_code; 
				insert into "inventory_smart".dc_transit_time_mapping (mapping_code,transit_time) values (_mapping_code,_transit_days);  	
			exception when no_data_found then 
				raise notice '%','No mapping found for Store DC transit';
			end ;
			*/
		end if;
		raise notice '%,%',_unmap_sql,_map_sql;
	end 
$function$
;
