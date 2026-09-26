--liquibase formatted sql
--changeset liquibase:sync_oms_otb_output runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_otb_output
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_otb_output(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_otb_output(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_otb_output';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              inventory_smart.oms_otb_output 
            where 
              true;
        end if;
  insert into inventory_smart.oms_otb_output
       (l2_name,
        planning_ownership,
        channel,
        fiscal_year_month,
        eligible_skus,
        approved_otb,
        otb,
        recom_receipts,
        mfp,
        total_cost
       )
   select
        l2_name,
        planning_ownership,
        channel,
        fiscal_year_month,
        eligible_skus,
        otb,
        otb,
        null,
        mfp_cost,
        total_cost
   from
     --public.oms_kpi
     public.oms_otb
   on conflict ON CONSTRAINT pk_oms_otb_output do update 
   set
       eligible_skus = excluded.eligible_skus,
       approved_otb = excluded.otb,
       mfp = excluded.mfp,
       otb = excluded.otb,
       total_cost = excluded.total_cost;
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
