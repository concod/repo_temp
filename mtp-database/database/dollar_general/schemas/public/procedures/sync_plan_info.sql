--liquibase formatted sql
--changeset swapnil-bhange:sync_plan_info_V2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:0081
--comment: updated SP for sync_plan_info
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_plan_info();
DROP PROCEDURE if exists public.sync_plan_info(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_plan_info(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_plan_info';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
            if _is_historic then 
            delete from global.plan_info
           where true;
        end if;
                
           INSERT INTO global.plan_info 
                (l0_code, 
                 l0_name, 
                 plan_start_date, 
                 plan_end_date, 
                 ly_plan_mapping, 
                 updated_by, 
                 updated_at)
                SELECT 
                  l0_code, 
                  l0_name, 
                  plan_start_date, 
                  plan_end_date, 
                  ly_plan_mapping, 
                  updated_by, 
                  updated_at
                 FROM 
                   public.plan_info
                   ON
  conflict DO nothing;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;