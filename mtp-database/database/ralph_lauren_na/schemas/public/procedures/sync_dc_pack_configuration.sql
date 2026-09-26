--liquibase formatted sql
--changeset liquibase:sync_dc_pack_configuration runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_dc_pack_configuration
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_pack_configuration();
CREATE OR REPLACE PROCEDURE public.sync_dc_pack_configuration()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_configuration';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.dc_pack_configuration 
		;
		INSERT INTO inventory_smart.dc_pack_configuration (
		 article,
		pack_type_id,
		pack_type,
		product_code,
		size,
		units_in_pack
		) 
		SELECT  paf.article , x.parent_product_code as pack_type_id, 'packs' pack_type, paf.product_code product_code,
		paf."size" as size,
		x.bom_quantity units_in_pack
		FROM public.bom_latest x join 
		global.product_attributes_filter paf 
		on x.child_product_code =paf.product_code ;
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
