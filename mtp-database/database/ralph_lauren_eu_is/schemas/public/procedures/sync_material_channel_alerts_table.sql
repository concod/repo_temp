--liquibase formatted sql
--changeset ishaan.singh:sync_material_channel_alerts_table runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:MTP-50161
--comment: new table added material channel alert table
--rollback: SELECT 1
DROP procedure if exists public.sync_material_channel_alerts_table(bool);
create or replace procedure public.sync_material_channel_alerts_table (in _is_historic boolean default true) 
language plpgsql 
as $procedure$
DECLARE
    _worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_material_channel_alerts_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Truncate the target table
    SELECT async_query INTO _worker FROM public.async_query('TRUNCATE TABLE inventory_smart.material_channel_alert_table;');
    PERFORM public.async_query_status(_worker, 'cleanup');
    RAISE NOTICE 'Step1: %', (clock_timestamp() - _st);

    -- Insert data from source to target table
    perform public.parellel_insert('WITH rows AS (
        INSERT INTO inventory_smart.material_channel_alert_table (
            article, store_code, channel, alert_name
        )
        SELECT 
            article, store_code, channel, alert_name
        FROM 
            public.material_channel_alert_table {where} RETURNING 1
        ) 
        SELECT 
            count(1) as cnt 
        FROM 
            rows;',
50,
'public.material_channel_alert_table',
'article',
'li_idx',
100);
    RAISE NOTICE 'Step2: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;