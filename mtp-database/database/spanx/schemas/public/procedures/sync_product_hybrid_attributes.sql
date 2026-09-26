--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:sync_product_hybrid_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_product_hybrid_attributes

DROP PROCEDURE IF EXISTS public.sync_product_hybrid_attributes(bool);

CREATE OR REPLACE PROCEDURE public.sync_product_hybrid_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_hybrid_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
UPDATE global.product_attributes_filter paf
SET 
    ordering = pha.ordering
--    replenishment_status = pha.replenishment_status
FROM public.oms_product_hybrid_attributes pha
WHERE paf.product_code = pha.product_code
;
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