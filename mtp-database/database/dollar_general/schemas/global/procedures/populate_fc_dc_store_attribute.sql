-- liquibase formatted sql
-- changeset swapnil.bhange:populate_fc_dc_store_attribute_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_fc_dc_store_attribute_v2
-- comment: added is_active to excluded for populate_fc_dc_store_attribute
DROP PROCEDURE if exists "global".populate_fc_dc_store_attribute();
CREATE OR REPLACE PROCEDURE global.populate_fc_dc_store_attribute()
 LANGUAGE plpgsql
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
	  INSERT INTO "global".distribution_centres (
		  "name", is_active, is_deleted, linked_store_code, is_virtual
		) 
		select 
		  store_name, 
		  active, 
		  is_deleted, 
		  store_code,
		  false
		from 
		  global.store_master 
		where 
		  special_classification = 'WHS' on conflict(linked_store_code, is_virtual) do 
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
		  t1.store_code = t2.linked_store_code
		  and is_virtual = false;
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
		  "global".distribution_centres
		where is_virtual = false;
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
