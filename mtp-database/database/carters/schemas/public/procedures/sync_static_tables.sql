--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:sync_static_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:sync_item_smart_derived_tables
--comment: initial changeset for sync_item_smart_derived_tables
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_static_tables(text, text);

CREATE OR REPLACE PROCEDURE public.sync_static_tables(IN p_target_table text, IN p_source_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_static_tables';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    v_sql text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   
    v_sql := format('DELETE FROM item_smart.%s;', p_target_table);
    EXECUTE v_sql;
    
    v_sql := format(
        'INSERT INTO item_smart.%s SELECT * FROM %s;',
        p_target_table, p_source_table
    );
    
    EXECUTE v_sql;
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
