--liquibase formatted sql
--changeset abijithsarath.menon::delete_asn_delta_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels: PACSUN-274
--comment: Updated SP for delete_asn_delta_chnage PACSUN
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.delete_latest_asn_delta();
CREATE OR REPLACE PROCEDURE public.delete_latest_asn_delta()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.delete_latest_asn_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from inventory_smart.latest_asn_delta
		where updated_at::timestamp <= (current_date + time '21:30');

		delete from inventory_smart.intermediate_cyclic_asn
		where rcd_ins_ts::date < current_date;
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
