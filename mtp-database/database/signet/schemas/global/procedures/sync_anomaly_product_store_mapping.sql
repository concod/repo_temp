--liquibase formatted sql
--changeset liquibase:sync_anomaly_product_store_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_anomaly_product_store_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.sync_anomaly_product_store_mapping();
CREATE OR REPLACE PROCEDURE global.sync_anomaly_product_store_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.sync_anomaly_product_store_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

		INSERT INTO "global".product_mapping_product_store_anomaly (
	  mapping_code, mapping_type, l0_name, 
	  product_code, store_code, is_active, 
	  validity
	) 
	select 
	  pmps.mapping_code, 
	  pmps.mapping_type, 
	  pmps.l0_name, 
	  pmps.product_code, 
	  pmps.store_code, 
	  pmps.is_active, 
	  pmps.validity
	from 
	  "global".product_mapping_product_store pmps 
	  join "global".product_attributes_filter paf using (product_code) 
	  join "global".store_attributes_filter saf using (store_code) 
	where 
	  store_code like 'E%' 
	  and merchandise_category = 'NonProgram';
	
			
	delete FROM 
	  "global".product_mapping_product_store a USING "global".product_mapping_product_store_anomaly b 
	WHERE 
	  a.mapping_code = b.mapping_code 
	  AND date(deleted_at) = date(now());

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
