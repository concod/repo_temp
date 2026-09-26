--liquibase formatted sql
--changeset liquibase:user_defined_product_profile_refresh runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:udpp
--comment:  sync_user_defined_product_profile_refresh
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_user_defined_product_profile_refresh();
CREATE OR REPLACE PROCEDURE public.sync_user_defined_product_profile_refresh()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_user_defined_product_profile_refresh';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin	
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		update inventory_smart.product_profile_mapping ppm
		set overall_proportion = x.overall_proportion
		from public.user_defined_product_profile_refresh x 
		where ppm.product_code = x.product_code and ppm.store_code = x.store_code and ppm.pp_code = x.pp_code; 
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$;
