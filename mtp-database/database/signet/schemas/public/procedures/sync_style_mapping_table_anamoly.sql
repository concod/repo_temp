--liquibase formatted sql
--changeset liquibase:sync_style_mapping_table_anamoly runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updates the style_mapping_table_anamoly
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS "public".sync_style_mapping_table_anamoly();
CREATE OR REPLACE PROCEDURE "public".sync_style_mapping_table_anamoly()
LANGUAGE plpgsql
AS $$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := '"public".sync_style_mapping_table_anamoly';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    insert into inventory_smart.style_mapping_table_anamoly
    select *,current_timestamp as inserted_at
    from inventory_smart.style_mapping_table
    where end_date < current_date; 
    
    delete from inventory_smart.style_mapping_table
    where end_date < current_date;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;