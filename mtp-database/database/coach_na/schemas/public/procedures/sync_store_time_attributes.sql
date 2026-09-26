--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_store_time_attributes runOnChange:true stripComments:false splitStatements:false context:sync_store_time_attributes labels:first commit
--comment: sync_store_time_attributes
--rollback: SELECT 1










DROP PROCEDURE IF EXISTS public.sync_store_time_attributes();


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
        SELECT
        store_code,
        'status' as attribute_name,
        status as attribute_value,
        cast(season_start_date as date ) as  start_time,
        cast(season_end_date as date) end_time
        FROM
        public.storeseason_validated_table
        JOIN global.store_attributes_filter saf USING (store_code)
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



