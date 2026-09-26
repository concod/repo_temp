--liquibase formatted sql
--changeset aman.lakkoju:populate_fc_dc_store_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for populate_fc_dc_store_attribute
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.populate_fc_dc_store_attribute();
CREATE OR REPLACE PROCEDURE global.populate_fc_dc_store_attribute()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.populate_fc_dc_store_attribute';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	  INSERT INTO "global".distribution_centres (dc_code,
		  "name", is_active, is_deleted, linked_store_code
		) 
		select 
		store_code::int as dc_code,	
		  store_name, 
		  active, 
		  is_deleted, 
		  store_code 
		from 
		  global.store_master 
		where 
		  special_classification = 'WHS' on conflict(linked_store_code) do 
		update 
		set 
		  is_active = excluded.is_active, 
		  is_deleted = not excluded.is_active;
		UPDATE 
		  "global".store_master t1 
		SET 
		  dc_code = t2.dc_code 
		FROM 
		  "global".distribution_centres t2 
		WHERE 
		  t1.store_code = t2.linked_store_code;
		delete from 
		  "global".store_attributes 
		where 
		  attribute_name in('dc_name');
		insert into "global".store_attributes 
		select 
		  linked_store_code as store_code, 
		  'dc_name' as attribute_name, 
		  name as attribute_value 
		from 
		  "global".distribution_centres;
	  call global.build_store_attributes_filter('');
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
  end;
$procedure$
;
