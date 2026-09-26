-- liquibase formatted sql
-- changeset pradeep.kumar@impactanalytics.co:sync_oms_supersession_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_supersession_mapping
-- comment: initial changeset for sync_oms_supersession_mapping

DROP PROCEDURE IF EXISTS public.sync_oms_supersession_mapping();

CREATE OR REPLACE PROCEDURE public.sync_oms_supersession_mapping()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_supersession_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    TRUNCATE TABLE inventory_smart.oms_supersession_mapping;
    INSERT INTO
    inventory_smart.oms_supersession_mapping (
        child_sku,
        parent_sku,
        from_date,
        to_date)
    SELECT
        src.child_sku,
        src.parent_sku,
        src.from_date,
        src.to_date
    FROM
        public.oms_supersession_mapping AS src;
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