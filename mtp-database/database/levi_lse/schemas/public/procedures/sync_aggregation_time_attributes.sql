--liquibase formatted sql
--changeset himansh.bhardwaj:changed the public table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: changed the public table
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_aggregation_time_attributes();
CREATE OR REPLACE PROCEDURE public.sync_aggregation_time_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_aggregation_time_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	call global.build_list_partitions('aggregation_time_attributes');
    -- upsert query
    INSERT INTO global.aggregation_time_attributes
        (aggregation_code, attribute_name, attribute_value, start_time, end_time)
    SELECT DISTINCT
        s.aggregation_code,
        attribute_name,
        attribute_value,
        start_time,
        end_time
    FROM
        public.aggregation_time_attributes_validated_table s
    JOIN
        (Select distinct article from global.product_attributes_filter paf) paf
    ON s.aggregation_code = paf.article
    ON CONFLICT (aggregation_code,attribute_name,start_time) DO
    UPDATE
    SET 
        attribute_value = EXCLUDED.attribute_value;
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