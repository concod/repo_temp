--liquibase formatted sql
--changeset liquibase:update_constraint_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_constraint_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.update_constraint_mapping();
CREATE OR REPLACE PROCEDURE global.update_constraint_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.update_constraint_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 	UPDATE 
	  inventory_smart.constraint_master t1 
	SET 
	  mapping_code = t2.mapping_code,
	  l0_name = t2.l0_name 
	FROM 
	  global.product_mapping_product_store t2 
	WHERE 
	  t1.product_code = t2.product_code 
	  and t1.store_code = t2.store_code 
	  and t1.mapping_code is null and t1.l0_name is null;
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

CREATE OR REPLACE PROCEDURE global.update_constraint_mapping(IN p_mapping_codes integer[])
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.update_constraint_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	UPDATE 
	  inventory_smart.constraint_master t1 
	SET 
	  mapping_code = t2.mapping_code,
	  l0_name = t2.l0_name 
	FROM 
	  global.product_mapping_product_store t2 
	WHERE 
	  t1.product_code = t2.product_code 
	  and t1.store_code = t2.store_code 
	  and t1.mapping_code = any(p_mapping_codes);
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
