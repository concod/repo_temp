--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_store_time_attributes_change_v2 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_store_time_attributes
--comment: initial changeset for sync_store_time_attributes 

DROP PROCEDURE if exists public.sync_store_time_attributes();

CREATE OR REPLACE PROCEDURE public.sync_store_time_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_time_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        call global.build_list_partitions('store_time_attributes');
        INSERT INTO "global".store_time_attributes
        (store_code, attribute_name, attribute_value, start_time, end_time)
        SELECT distinct
        store_code,
        'status' attribute_name,
        status attribute_value,
        cast(season_start_date as date) start_time,
        cast(season_end_date as date) end_time
        FROM 
          public.storeseason_validated_table
        on conflict (store_code,
        attribute_name,
        start_time, end_time) do
        update
        set
            attribute_value = EXCLUDED.attribute_value;
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