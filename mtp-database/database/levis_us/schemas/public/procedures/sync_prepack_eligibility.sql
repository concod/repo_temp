--liquibase formatted sql
--changeset himansh.bhardwaj:sync_prepack_eligibility runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_prepack_eligibility();
CREATE OR REPLACE PROCEDURE public.sync_prepack_eligibility()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_prepack_eligibility';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        --deleting the table
        delete from 
          inventory_smart.prepack_eligibility
        where 
          true;
        
        -- insert everything
        insert into inventory_smart.prepack_eligibility (
            l0_name, l1_name, article, on_floor_date, store_code, eligible_packs, allocation_type
        ) 
        SELECT 
           l0_name, l1_name, article, on_floor_date, store_code, eligible_packs, allocation_type
        FROM 
          public.prepack_eligibility x;
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