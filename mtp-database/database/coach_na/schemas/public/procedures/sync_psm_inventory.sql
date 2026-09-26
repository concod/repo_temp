--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_psm_inventory runOnChange:true stripComments:false splitStatements:false context:sync_psm_inventory labels:first commit
--comment: sync_psm_inventory
--rollback: SELECT 1



DROP PROCEDURE IF EXISTS public.sync_psm_inventory();

CREATE OR REPLACE PROCEDURE public.sync_psm_inventory()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _worker text;
    _sql TEXT ;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_psm_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
   
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin


    SELECT async_query INTO _worker from public.async_query('truncate inventory_smart.psm_inventory;');
    PERFORM public.async_query_status(_worker, 'cleanup');
    RAISE NOTICE 'Step1: %', (clock_timestamp() - _st);


    _st := clock_timestamp();


    _sql := ' WITH rows
              AS (
                    INSERT INTO inventory_smart.psm_inventory (product_code,store_code,article, total_inv)
                    SELECT  product_code,store_code,article, total_inv
                    FROM    public.psm_inventory
                    {where} on conflict do nothing RETURNING 1
                )
              SELECT count(1) as cnt FROM rows; ';
    PERFORM public.parellel_insert(_sql,50, 'public.psm_inventory ', 'product_code', 'psm_inventory_idx', 500);
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
