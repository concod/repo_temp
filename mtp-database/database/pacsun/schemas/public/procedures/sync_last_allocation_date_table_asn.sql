--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_last_allocation_date_table_asn_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:cb_test
--comment: initial changeset
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_last_allocation_date_table_asn();
CREATE OR REPLACE PROCEDURE public.sync_last_allocation_date_table_asn()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_last_allocation_date_table_asn';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        delete from 
          inventory_smart.last_allocation_date_table_asn 
        where 
          true;
        
        INSERT INTO inventory_smart.last_allocation_date_table_asn(asn_id, article, last_allocation_date) 
        select 
        replace(dc_codes[1], '''', '') as asn_id,
        article, 
        CAST(MAX(updated_at) AS DATE) as last_allocation_date
        from inventory_smart.create_allocation_result_flat_gurobi carfg 
        where status = 2 
        -- and allocated_total > 0
        and "source" = 'asn'
        group by 1, 2;               
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