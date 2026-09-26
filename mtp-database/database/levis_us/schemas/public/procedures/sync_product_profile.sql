--liquibase formatted sql
--changeset himansh.bhardwaj:sync_product_profile_running_historic_everyday runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: sync_product_profile_running_historic_everyday
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_profile();
CREATE OR REPLACE PROCEDURE public.sync_product_profile()
 LANGUAGE plpgsql
--  SECURITY DEFINER
AS $procedure$
declare 
		-- _today int;
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
	-- select EXTRACT(dow FROM CURRENT_DATE) into _today; 
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
	-- if _today = 1 then
		raise notice 'running historic';
		perform public.parellel_insert('WITH rows AS (
			DELETE FROM inventory_smart.product_profile_master {where} and special_classification = ''ia-recommended''
				RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'inventory_smart.product_profile_master', 'pp_code', null, 500);
		raise notice 'Step 1: %', (clock_timestamp() - _st);
	-- else
	/*
		raise notice 'running periodic';
		perform public.parellel_insert('WITH rows AS (
			DELETE FROM inventory_smart.product_profile_master {where} and special_classification = ''ia-recommended''
				RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.product_profile', 'pp_code', 'ppp_idx', 500);
		raise notice 'Step 1: %', (clock_timestamp() - _st);
	*/
	-- end if;
   	perform public.parellel_insert('WITH rows AS (
		INSERT INTO inventory_smart.product_profile_master (
		  pp_code, "name", description, special_classification,
		  ph_code
		)
		select
		  pp_code,
		  "name",
		  description,
		  special_classification,
		  (select hierarchy_code from global.product_hierarchies_filter where (path, level) = (jsonb_build_object(' || _hies_j || '), ' || _ph_hie_level || ') and active)
		from
		  (
		    select
		      pp_code,
		      name,
			  description,
		      special_classification,
		      product_code
		    from
		      public.product_profile
				{where}
		    group by 
		    	1, 2, 3, 4, 5
		  ) pp
		  join global.product_attributes_filter paf using(product_code)
		  group by 1,2,3,4, ' || _hies || ' RETURNING 1) 
	SELECT 
	  count(1) as cnt 
	FROM 
	  rows;', 50, 'public.product_profile', 'pp_code', 'ppp_idx', 50);
	raise notice 'Step 2: %', (clock_timestamp() - _st);
--
	select async_query into _worker from public.async_query('call global.build_list_partitions(''product_profile_mapping'');');
	perform public.async_query_status(_worker, 'cleanup');
--
		perform public.parellel_insert('WITH rows AS (
			INSERT INTO inventory_smart.product_profile_mapping (
			  pp_code,  l0_name, size_level_proportion, 
			  overall_proportion, product_code, 
			  store_code, size
			) 
			SELECT 
			  pp_code, 
			  channel as l0_name,
			  size_level_proportion, 
			  overall_proportion, 
			  product_code, 
			  store_code,
			  size
			FROM 
			  public.product_profile
				{where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.product_profile', 'pp_code', 'ppp_idx', 50);
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
