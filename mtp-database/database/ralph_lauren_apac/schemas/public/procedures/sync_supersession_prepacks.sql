--liquibase formatted sql
--changeset pooja.shekar:added logic for supersession prepacks runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-67818
--comment: 	added logic for supersession prepacks
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_supersession_prepacks();
CREATE OR REPLACE PROCEDURE public.sync_supersession_prepacks()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_supersession_prepacks';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
UPDATE  "inventory_smart".dc_pack_inventory d
SET article = ss.new_article
FROM "inventory_smart".style_mapping_table ss
WHERE d.article = ss.old_article;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;