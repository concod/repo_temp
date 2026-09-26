--liquibase formatted sql
--changeset dushant.raut:alerts_product_store_level_instore_date_handling_2 runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-36140
--comment: 	replaced date with instore_date
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_priority_code_config();
CREATE OR REPLACE PROCEDURE public.sync_priority_code_config()
	LANGUAGE plpgsql
    SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_priority_code_config';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	insert into inventory_smart.priority_code_configuration(article,store_code,channel,l0_name) 
select distinct article,store_code,channel,l0_name from inventory_smart.article_status_tag ast 
join "global".store_attributes_filter saf 
using(channel)
join "global".product_attributes_filter paf 
using(product_code)
where saf.active and paf.active
ON CONFLICT (article,store_code,l0_name) DO nothing;

update inventory_smart.priority_code_configuration 
set instore_date=current_date 
where instore_date <current_date;
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