--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_last_allocation_date_table_V2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:VS-521
--comment: Change the status value
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_last_allocation_date_table();
CREATE OR REPLACE PROCEDURE public.sync_last_allocation_date_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_last_allocation_date_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _today INT;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    SELECT EXTRACT(DOW FROM current_date)::INT INTO _today;

    IF _today = 0 THEN
        DELETE FROM inventory_smart.last_allocation_date_table WHERE TRUE;
        
        INSERT INTO inventory_smart.last_allocation_date_table (
            article,
            last_allocation_date
        )
        SELECT article, CAST(MAX(updated_at) AS DATE) AS last_allocation_date
        FROM inventory_smart.create_allocation_result_flat_gurobi carfg
        WHERE status = 2 AND allocated_total > 0
        GROUP BY 1;
    ELSE
        INSERT INTO inventory_smart.last_allocation_date_table (
            article,
            last_allocation_date
        )
        SELECT article, CAST(MAX(updated_at) AS DATE) AS last_allocation_date
        FROM inventory_smart.create_allocation_result_flat_gurobi carfg
        WHERE created_at >= NOW() - INTERVAL '7 days'
              AND created_at < NOW() + INTERVAL '2 days'
              AND status = 2 AND allocated_total > 0
        GROUP BY 1
        ON CONFLICT(article)
        DO UPDATE SET last_allocation_date = EXCLUDED.last_allocation_date;
    END IF;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
