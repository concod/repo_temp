--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_plan_smart_net_implied runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-30856
--comment: initial changeset for sync_plan_smart_net_implied
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_plan_smart_net_implied(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_plan_smart_net_implied(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_plan_smart_net_implied';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              plan_smart.net_implied_derived 
            where 
              true;
        end if;
  insert into plan_smart.net_implied_derived
      (channel,
       hierarchy_code,
       dept_no,
       dept_name,
       chester_net_implied_percent
      )
  select
	   channel,
	   hierarchy_code,
	   dept_no,
	   dept_name,
	   chester_net_implied_percent
  from
    --public.net_implied_derived
    public.net_implied_derived where channel is not null
  on conflict ON CONSTRAINT pk_net_implied_derived do update 
  set
      dept_no = excluded.dept_no,
      dept_name = excluded.dept_name,
      chester_net_implied_percent = excluded.chester_net_implied_percent;
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