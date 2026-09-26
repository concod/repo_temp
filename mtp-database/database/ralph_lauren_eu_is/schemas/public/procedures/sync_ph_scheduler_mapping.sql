--liquibase formatted sql
--changeset saad.adeeb:sync_ph_scheduler_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43866
--comment: initial changeset for sync_store_holiday_calendar
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_ph_scheduler_mapping();
CREATE OR REPLACE PROCEDURE public.sync_ph_scheduler_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_ph_scheduler_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
insert into inventory_smart.ph_scheduler_mapping
select ph_code,article,channel,l0_name,(select rule_code from inventory_smart.alloc_rule_master arm where rule_name='Default'),
true,112,112
from inventory_smart.ph_master
where  article_status_tag not in ('Old','No Network Inventory','Only Store Inventory')
and concat(ph_code,channel) not in (select concat(ph_code,channel) from inventory_smart.ph_scheduler_mapping);
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