--liquibase formatted sql
--changeset himansh.bhardwaj:security definer removed runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: security definer removed
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_latest_inventory();
CREATE OR REPLACE PROCEDURE public.sync_latest_inventory()
 LANGUAGE plpgsql
--  SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_latest_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();

	_worker text;
	_sql TEXT ;
	
BEGIN 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    --deleting the table
	SELECT async_query INTO _worker from public.async_query('truncate inventory_smart.latest_inventory;'); 
	PERFORM public.async_query_status(_worker, 'cleanup');
	RAISE NOTICE 'Step1: %', (clock_timestamp() - _st);

	_st := clock_timestamp();
	-- insert everything
	_sql := ' WITH rows 
			  AS (
					INSERT INTO inventory_smart.latest_inventory (date, channel, product_code, store_code, oh, it, oo, l0_name, l1_name ) 
					SELECT 	x.date, saf.channel, x.product_code, x.store_code, x.oh, x.it, x.oo, paf.l0_name, paf.l1_name
					FROM 	public.latest_inventory x
							join global.product_attributes_filter paf using (product_code)
							join "global".store_attributes_filter saf using(store_code)
					{where} on conflict do nothing RETURNING 1
				) 
			  SELECT count(1) as cnt FROM rows; ';
	PERFORM public.parellel_insert(_sql,50, 'public.latest_inventory ', 'product_code', 'pli_idx', 500);
	RAISE NOTICE 'Step2: %', (clock_timestamp() - _st);

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;