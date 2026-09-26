-- liquibase formatted sql
-- changeset aman_lakkoju:updated sync_purge_allocation_daily runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels: sync_purge_allocation_daily
-- comment: initital changeset for sync_purge_allocation_daily

DROP procedure if exists inventory_smart.sync_purge_allocation_daily();
CREATE OR REPLACE PROCEDURE inventory_smart.sync_purge_allocation_daily()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.sync_purge_allocation_daily';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    UPDATE
        inventory_smart.plan_master
    SET
        is_deleted = TRUE
    WHERE
        plan_code IN (
            select distinct
                a.plan_code
            FROM
                inventory_smart.plan_master a
            LEFT JOIN
                inventory_smart.create_allocation_result_flat_gurobi b
            ON
                a.plan_code = b.allocation_code
            WHERE
                b.inventory_source NOT IN ('po', 'ns')
                AND a.status in (1,2)
                and a.type = 2 
                and a.created_at between (date(now() AT TIME ZONE 'America/chicago'::text) -1 + '00:00:00'::interval) 
                          and (date(now() AT TIME ZONE 'America/chicago'::text) -1 + '23:59:59'::interval) )
        AND is_deleted IS FALSE;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;