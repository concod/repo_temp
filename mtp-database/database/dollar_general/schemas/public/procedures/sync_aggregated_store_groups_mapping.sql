--liquibase formatted sql
--changeset  rajat-choudhary-3:sync_aggregated_store_groups_mapping_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:003
--comment: added on conflict codition aggregated_store_groups_mapping table
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_aggregated_store_groups_mapping();
CREATE OR REPLACE PROCEDURE public.sync_aggregated_store_groups_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_aggregated_store_groups_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		INSERT INTO "global".aggregated_store_groups_mapping (sg_code, psa_code, store_count) 
		select sg.sg_code, psaf.psa_code, store_count
		from "global".store_groups sg 
		join public.store_group sg2 
		on sg."name" = sg2.sg_name
		join public.psa_code_store_count psaf 
		using (psa_code)
		group by 1,2,3
		ON conflict DO nothing
		;
	
		update "global".aggregated_store_groups_mapping a
        set store_count = b.store_count
        from public.psa_code_store_count b 
        where b.psa_code = a.psa_code;
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
