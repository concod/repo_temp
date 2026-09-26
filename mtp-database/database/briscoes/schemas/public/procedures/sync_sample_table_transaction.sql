--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:sync_sample_table_transaction_revenue runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_sample_table_transaction
--comment: initial changeset for sync_sample_table_transaction_revenue
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_sample_table_transaction();
CREATE OR REPLACE PROCEDURE public.sync_sample_table_transaction()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_sample_table_transaction';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM 
      inventory_smart.sample_table_transaction 
    WHERE 
      true;
    INSERT INTO inventory_smart.sample_table_transaction (
      product_code, article, store_code, date, qty, msrp, cost_excl_tax, discount_amount, revenue
    ) 
    SELECT 
      product_code, article, store_code, date, qty, msrp, cost_excl_tax, discount_amount, revenue
    FROM public.sample_table_transaction x ;
   
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
