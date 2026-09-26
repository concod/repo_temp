--liquibase formatted sql
--changeset liquibase:update_allocation_detail runOnChange:true stripComments:false splitStatements:false context:MTP-50162 labels:MTP-50162
--comment: MTP-50162,fixed syntax error, removed type check as its added in update plan, fix po_code got from wrong index
--rollback: SELECT 1
DROP procedure if exists inventory_smart.update_po_alerts(plan_code varchar);
CREATE OR REPLACE PROCEDURE inventory_smart.update_po_alerts(IN plan_code character varying)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.update_po_alerts';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _data text[];
    _po_code text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
--  Getting Po number from carfg dc_code
    SELECT array(
        select
        DISTINCT UNNEST(carfg.dc_codes) dc_code
        from inventory_smart.create_allocation_result_flat_gurobi carfg
        where allocation_code = $1)
    INTO _data;
    -- Updation Part
    IF COALESCE(array_length(_data,1), 0)>0 THEN
        _po_code = _data[1];
        execute 'UPDATE "inventory_smart".po_alerts SET is_deleted = true WHERE po_code = ' || _po_code || ';';
    END IF;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;
