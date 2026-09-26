--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_constraint_master runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: initial changeset for sync_constraint_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_constraint_master();
CREATE OR REPLACE PROCEDURE public.sync_constraint_master()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_constraint_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _worker text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
begin
        
    SELECT async_query INTO _worker from public.async_query('call global.build_list_partitions(''constraint_master'');'); 
	PERFORM public.async_query_status(_worker, 'cleanup');
    
    -- raise notice 'Step1: %', (clock_timestamp() - _st);

   SELECT async_query INTO _worker from public.async_query('drop table if exists public.constraint_mapping;'); 
	PERFORM public.async_query_status(_worker, 'cleanup');


   _log_step ='Creating unlogged table';

   -- raise notice 'creating unlogged table: %', (clock_timestamp() - _st);

    SELECT async_query INTO _worker from public.async_query('
    create unlogged table public.constraint_mapping as
	    select 
	     pmps.mapping_code, 
	           pmps.l0_name,
	           x.channel, 
	           x.product_code, 
	           x.store_code, 
	           x.wos, 
	           x.transit_time, 
	           x.safety_stock, 
	           coalesce(x.min_stock, 0) as min_stock, 
	           coalesce(x.max_stock, 0) as max_stock, 
	           x.aps, 
	           x.ros 
	         FROM 
	           public.constraint_master x 
	           left join global.product_mapping_product_store pmps
	           using(product_code,store_code)
	    '); 
	PERFORM public.async_query_status(_worker, 'cleanup');

    call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
    
    raise notice 'unlogged table is done: %', (clock_timestamp() - _st);

    perform public.parellel_insert('WITH rows AS (INSERT INTO inventory_smart.constraint_master (
          mapping_code, l0_name, channel, product_code, 
          store_code, wos, transit_time, safety_stock, 
          min_stock, max_stock, aps, ros
        ) 
          (select mapping_code, l0_name, channel, product_code, 
          store_code, wos, transit_time, safety_stock, 
          min_stock, max_stock, aps, ros from public.constraint_mapping  {where} ) 
           
           on conflict do nothing RETURNING 1) 
		    SELECT 
		      count(1) as cnt 
		    FROM 
      rows;', 25, 'public.constraint_mapping', 'store_code', 'cstore_idx', 250);

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
