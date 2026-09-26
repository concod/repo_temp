--liquibase formatted sql
--changeset liquibase:sync_transaction_master_month_wise runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:MTP-28454
--comment: initial changeset for sync_transaction_master_month_wise
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_transaction_master_month_wise();
CREATE OR REPLACE PROCEDURE public.sync_transaction_master_month_wise()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_transaction_master_month_wise';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
                delete from global.transaction_master_month_wise;
                INSERT INTO global.transaction_master_month_wise 
                (l1_name, l2_name, l3_name, l4_name, primary_sku, store_code, fiscal_year, fiscal_month, qty, price,
"size", day_count, count)
                SELECT 
                  l1_name, l2_name, l3_name, l4_name, primary_sku, store_code, fiscal_year, fiscal_month, qty, price,
"size", day_count, count
                 FROM 
                   public.transaction_master_month_wise
                   ;
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