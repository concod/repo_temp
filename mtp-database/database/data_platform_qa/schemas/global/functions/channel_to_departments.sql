--liquibase formatted sql
--changeset liquibase:channel_to_departments runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for channel_to_departments
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.channel_to_departments(input refcursor, character varying[]);
CREATE OR REPLACE FUNCTION global.channel_to_departments(input refcursor, character varying[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*  
 * Function/Procedure name: global.channel_to_departments
 * Created by: Ashish Gupta
 * Created at: 18-Nov-2022
 * No of input parameter: 2
 * Parameter Description : $1 = Cursor Name
 *                         $2 = Array for channel names  
 * Purpose: To return l0 values associated with channels.
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    20-Nov-2022		Added cache logic
 */
	declare
	_channels_filter jsonb := '{"channel":[{"type":"list", "operator":"in", "values": ' || array_to_json($2) || '}]}';
	_res jsonb;
	_sql text;

	_cache_payload jsonb := jsonb_build_object('channel_dept', $2 );
	_cache_table_id text;
	_cache_schema text := 'global';
	_cache_sp text := '.channel_to_departments';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{global.product_mapping_product_store,global.product_attributes_filter,global.store_attributes_filter}';

	begin
 		_sql := 'select 
				jsonb_object_agg(channel, l0_name) channel_dept
			from (select distinct channel, array_agg(l0_name) as l0_name 
				from (
				select
					distinct channel, l0_name 
					--channel as channel,
					--array_agg(distinct l0_name) as l0_name
				from
					(' || global.products_store_filters(
						' {}',
						' {"l0_name":[]}',
						' {}',
						_channels_filter
					) || ') main
				group by
					1, 2 ) x group by 1 ) y';
		raise notice '%', _sql;
	
	select
		  * 
		from 
		  cache.wrap_sp(
			_cache_schema, _cache_sp, _cache_payload, 
			_sql, _cache_dependencies, 
			_cache_key_pattern
		  ) into _cache_table_id;
		
		perform set_config(
		  'myvars.cache_table_id', _cache_table_id, 
		  true
		);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' ;
		RETURN $1;
	---return query execute _sql;
	end $function$
;
