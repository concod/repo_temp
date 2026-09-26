--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:sync_constraint_master_aps runOnChange:true stripComments:false splitStatements:false context:DAT-1117 labels:sync_constraint_master_aps
--comment: create SP to optimize the performance. 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_constraint_master_aps();
CREATE OR REPLACE PROCEDURE public.sync_constraint_master_aps()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_constraint_master_aps';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	update inventory_smart.constraint_master cm set aps = x.aps from 
	(select aps,store as store_code,sku as product_code from public.vb_aps_append_table aat ) x 
	where cm.store_code =x.store_code
	and cm.product_code = x.product_code;

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
