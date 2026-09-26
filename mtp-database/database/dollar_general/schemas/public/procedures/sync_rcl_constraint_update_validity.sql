--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:sync_rcl_constraint_update_validity_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:V003
--comment: Created SP for sync_rcl_constraint_update_validity_v3
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_rcl_constraint_update_validity();
CREATE OR REPLACE PROCEDURE public.sync_rcl_constraint_update_validity()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_constraint_update_validity';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    		        update inventory_smart.rcl_constraint_master rcm 
				set validity = b.validity
				from (
				select rcm2.rule_code, daterange(pi2.plan_start_date, (pi2.plan_end_date+31)) as validity
				from inventory_smart.rcl_constraint_master rcm2
				join inventory_smart.rcl_constraint_master_rule rcmr USING(rule_code)
				join "global".plan_info pi2 ON rcmr.rcl_dimension->>'l0_code' = pi2.l0_code
				group by 1,2
				) b 
	   		where 
			  rcm.rule_code = b.rule_code ;
		 
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

