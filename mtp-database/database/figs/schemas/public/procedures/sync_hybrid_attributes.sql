--liquibase formatted sql
--changeset priyaranjan.pradhan@impactanalytics.co:sync_hybrid_attributes_with_rcl_support runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:add_ha
--comment: added rcl hash support for sync_hybrid_attributes_ha
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_hybrid_attributes();
CREATE OR REPLACE PROCEDURE public.sync_hybrid_attributes()
 LANGUAGE plpgsql
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_hybrid_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_rcl_hash text;
	_worker text;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		select 
		  string_agg(distinct v, ' || ') into _rcl_hash
		from 
		  (
		    select 
		      'jsonb_build_object(' || global.get_rcl_hash_query_v2(rcl_code, level) || ')' as v, 
		      unnest(level) as l 
		    from 
		      global.rcl_master 
		    where 
		      not is_deleted
		  ) x;
		perform public.parellel_insert('WITH rows AS (
			update 
			  global.product_attributes_filter t1 
			set 
			  rcl_hash = t2.rcl_hash
			from 
			  (
			    select 
			      product_code, 
			      ' || _rcl_hash || ' as rcl_hash
				from 
				  global.product_attributes_filter paf 
			    {where} and paf.active = true
			  ) t2 
			where 
			  t1.product_code = t2.product_code returning 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'global.product_attributes_filter', 'product_code', null, 500);
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
