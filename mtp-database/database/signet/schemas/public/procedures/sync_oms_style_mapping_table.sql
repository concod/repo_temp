--liquibase formatted sql
--changeset liquibase:sync_oms_style_mapping_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sync_oms_style_mapping_table

DROP PROCEDURE IF EXISTS public.sync_oms_style_mapping_table(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_style_mapping_table(IN _is_historic boolean DEFAULT false)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_style_mapping_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    IF _is_historic THEN
        DELETE FROM inventory_smart.oms_style_mapping_table WHERE true;
    END IF;

    INSERT INTO inventory_smart.oms_style_mapping_table (
        new_article,
        new_product_code,
        old_article,
        old_product_code,
        old_l0_name,
        old_l1_name,
        old_l2_name,
        old_l3_name,
        old_cvsc,
        old_product_description,
        old_size,
        old_size_name,
        mapping_type,
        priority,
        updated_at,
        updated_by,
        has_store_exception,
        start_date,
        end_date,
        eff_lead_time
    )
    SELECT
        new_article,
        new_product_code,
        old_article,
        old_product_code,
        old_l0_name,
        old_l1_name,
        old_l2_name,
        old_l3_name,
        old_cvsc,
        old_product_description,
        old_size,
        old_size_name,
        mapping_type,
        priority,
        updated_at,
        updated_by,
        has_store_exception,
        start_date,
        end_date,
        eff_lead_time
    FROM
        public.oms_style_mapping_table;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;