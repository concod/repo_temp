--liquibase formatted sql
--changeset tarunreddy.challa@impactanalytics.co:sync_purge_allocation runOnChange:true stripComments:false splitStatements:false context:sync_purge_allocation. labels:DAT-1101
--comment: vb sync_purge_allocation.
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS inventory_smart.sync_purge_allocation();
CREATE OR REPLACE PROCEDURE inventory_smart.sync_purge_allocation()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.sync_purge_allocation';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		update
	inventory_smart.plan_master
set
	is_deleted = true
where
	plan_code in (
	select
		plan_code
	from
		inventory_smart.plan_master pm
	where
		plan_code in 
(
		select
			a.plan_code
		from
			inventory_smart.plan_master a
		left join inventory_smart.create_allocation_result_flat_gurobi b on
			a.plan_code = b.allocation_code
		where
			b.order_type != 'L'
			and a.status = 2
		group by
			a.plan_code )
		and is_deleted is false) ;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$ ;
