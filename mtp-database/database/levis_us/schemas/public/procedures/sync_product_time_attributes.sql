--liquibase formatted sql
--changeset himansh.bhardwaj:updated some column names runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_time_attributes();
CREATE OR REPLACE PROCEDURE public.sync_product_time_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_time_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	call global.build_list_partitions('product_time_attributes');
    -- upsert query
    INSERT INTO global.product_time_attributes
        (product_code, attribute_name, attribute_value, start_time, end_time, l0_name)
    SELECT DISTINCT
        s.product_code,
        attribute_name,
        attribute_value,
        start_time,
        end_time,
        paf.l0_name
    FROM
        public.productseason_validated_table s
        JOIN global.product_attributes_filter paf USING (product_code)
    ON CONFLICT (product_code, attribute_name, start_time, l0_name) DO
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