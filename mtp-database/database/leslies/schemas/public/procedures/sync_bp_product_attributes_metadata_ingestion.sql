-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_product_attributes_metadata_ingestion_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_competitor_attributes
-- comment: derived table for sync_bp_product_attributes_metadata_ingestion_v1

DROP  PROCEDURE if exists public.sync_bp_product_attributes_metadata_ingestion();

CREATE OR REPLACE PROCEDURE public.sync_bp_product_attributes_metadata_ingestion()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_product_attributes_metadata_ingestion';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Clear destination table
    TRUNCATE TABLE base_pricing.bp_product_attributes_metadata_ingestion CASCADE;

    -- Insert transformed data
    INSERT INTO base_pricing.bp_product_attributes_metadata_ingestion (
        attribute_id,
        attribute_name,
        frontend_display_name,
        data_type,
        input_type,
        input_values,
        default_visibility,
        is_active
    )
    SELECT
        attribute_id,
        attribute_name,
        frontend_display_name,
        data_type,
        input_type,
        CASE 
            WHEN input_values IS NULL OR TRIM(input_values) ILIKE 'null' THEN NULL 
            ELSE input_values::jsonb 
        END AS input_values,

        COALESCE(default_visibility, false),
        COALESCE(is_active, true)
    FROM public.bp_product_attributes_metadata_ingestion;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
