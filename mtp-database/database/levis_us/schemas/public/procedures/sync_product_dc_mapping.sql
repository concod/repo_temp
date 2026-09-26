--liquibase formatted sql
--changeset himansh.bhardwaj:SP updated to new changes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_dc_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_dc_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_dc_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        -- delete which are not present
        delete from global.product_mapping_product_dc
        where concat(product_code,dc_code) not in(
        select distinct concat(product_code,dc.dc_code)
		from public.product_dc_mapping pdm
		join global.distribution_centres dc
		on pdm.dc_code = dc.linked_store_code);
        
	    -- upsert query
	    insert into global.product_mapping_product_dc(
		mapping_type, product_code, dc_code, is_active 
		)
		select 'product_dc', product_code, dc.dc_code, active is_active
		from public.product_dc_mapping pdm
		join global.distribution_centres dc
		on pdm.dc_code = dc.linked_store_code
		on conflict(product_code, dc_code)
		do update 
		set is_active = EXCLUDED.is_active;
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