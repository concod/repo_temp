--liquibase formatted sql
--changeset ashish@impactanalytics.co:sync_product_profile runOnChange:true stripComments:false splitStatements:false context:New_Sync_Stratgy labels:DAT-832
--comment: initial changeset for sync_product_profile
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_profile();
CREATE OR REPLACE PROCEDURE public.sync_product_profile()
 LANGUAGE plpgsql
AS $procedure$
declare 
 		_hies varchar;
 		_hies_j varchar;
 		_ph_hie_level int;
 		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_profile';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		select 
 		  string_agg(generic_column_name, ', '), 
 		  string_agg('''' || generic_column_name || '''' || ', ' || generic_column_name, ', '), 
 		  max(hierarchy_level) into _hies, _hies_j, _ph_hie_level
 		from 
 		  (
 		    select 
 		      generic_column_name, 
 		      hierarchy_level 
 		    from 
 		      global.product_generic_schema_mapping 
 		    where 
 		      hierarchy_level <= (
 		        select 
 		          hierarchy_level 
 		        from 
 		          global.product_generic_schema_mapping 
 		        where 
 		          generic_column_name = 'article'
 		      ) 
 		    order by 
 		      2 asc
 		  ) x;
 		select async_query into _worker from public.async_query('delete from 
 		  inventory_smart.product_profile_mapping 
 		where pp_code in (select distinct pp_code from inventory_smart.product_profile_master where
 		  special_classification = ''ia-recommended'');');
 		perform public.async_query_status(_worker, 'cleanup');
 		select async_query into _worker from public.async_query('delete from 
 		  inventory_smart.product_profile_master 
 		where 
 		  special_classification = ''ia-recommended'';');
		perform public.async_query_status(_worker, 'cleanup');
 		-- perform global.create_drop_index_list_ingestion('inventory_smart', 'product_profile_master', true);
 		raise notice 'Step 1: %', (clock_timestamp() - _st);

 		perform public.parellel_insert('WITH rows AS (
			INSERT INTO inventory_smart.product_profile_master (
			  pp_code, "name", description, special_classification, 
			  ph_code
			) with pp as (
			  select 
			    pp_code, 
			    "name", 
			    description, 
			    special_classification, 
			    jsonb_build_object(' || _hies_j || ') as path, 
			    ' || _ph_hie_level || ' as level 
			  from 
			    public.product_profile 
			  {where}
			  group by 
			    1, 
			    2, 
			    3, 
			    4, 
			    ' || _hies || '
			), 
			phf as (
			  select 
			    hierarchy_code 
			  from 
			    global.product_hierarchies_filter 
			  where 
			    (path, level) = (
			      select 
			        path, 
			        level 
			      from 
			        pp
			    ) 
			    and active
			) 
			select 
			  pp_code, 
			  "name", 
			  description, 
			  special_classification, 
			  hierarchy_code as ph_code 
			from 
			  phf cross 
			  join pp RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 100, 'public.product_profile', 'pp_code', 'ppp_idx');
 		raise notice 'Step 2: %', (clock_timestamp() - _st);

 		-- perform global.create_drop_index_list_ingestion('inventory_smart', 'product_profile_mapping', true);
 		select async_query into _worker from public.async_query('call global.build_list_partitions(''product_profile_mapping'');');
		perform public.async_query_status(_worker, 'cleanup');
		perform public.parellel_insert('WITH rows AS (
			INSERT INTO inventory_smart.product_profile_mapping (
				  pp_code, mapping_code, l0_name, size_level_proportion, 
				  overall_proportion, product_code, 
				  store_code
				) 
				select
					pp_code,
					pmps.mapping_code,
					pmps.l0_name,
					size_level_proportion,
					overall_proportion,
					product_code,
					store_code
				from
					public.product_profile x
					left join global.product_mapping_product_store pmps
						using(l0_name, product_code,
					store_code)
				{where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 100, 'public.product_profile', 'pp_code', 'ppp_idx');
		raise notice 'Step 3: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
 	end
$procedure$
;
