-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_store_attributes_metadata_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_store_attributes_metadata
-- comment: derived table for sync_bp_store_attributes_metadata_v1

DROP  PROCEDURE if exists public.sync_bp_store_attributes_metadata();

CREATE OR REPLACE PROCEDURE public.sync_bp_store_attributes_metadata()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_store_attributes_metadata';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Step 1: Clear existing destination data
    TRUNCATE TABLE base_pricing.bp_store_attributes_metadata;

    -- Step 2: Insert transformed records
    INSERT INTO base_pricing.bp_store_attributes_metadata (
        attribute_id,
        attribute_name,
        frontend_display_name,
        data_type,
        input_type,
        input_values,
        input_validation_ids,
        default_visibility,
        is_static,
        is_dynamic,
        is_editable_from_app,
        is_editable_from_file,
        is_resettable,
        is_active,
        created_at,
        updated_at,
        is_filterable,
        cell_render_params
    )
    SELECT
        attribute_id,
        attribute_name,
        frontend_display_name,
        data_type,
        input_type,

        -- input_values (text → jsonb)
        CASE 
            WHEN input_values IS NULL OR TRIM(input_values) ILIKE 'null' THEN NULL
            ELSE input_values::jsonb 
        END AS input_values,

        -- input_validation_ids (text → int[])
        CASE 
            WHEN input_validation_ids IS NULL 
                OR TRIM(input_validation_ids) = '' 
                OR TRIM(input_validation_ids) IN ('null', '{}', 'NULL') THEN '{}'::int[]
            ELSE string_to_array(input_validation_ids, ',')::int[]
        END AS input_validation_ids,

        COALESCE(default_visibility, false),
        COALESCE(is_static, false),
        COALESCE(is_dynamic, false),
        COALESCE(is_editable_from_app, true),
        COALESCE(is_editable_from_file, true),
        COALESCE(is_resettable, false),
        COALESCE(is_active, true),

        -- created_at and updated_at (text → timestamp)
        COALESCE(created_at::timestamp, CURRENT_TIMESTAMP),
        COALESCE(updated_at::timestamp, CURRENT_TIMESTAMP),
        COALESCE(is_filterable, false),

        -- cell_render_params (text → jsonb)
        CASE 
            WHEN cell_render_params IS NULL OR TRIM(cell_render_params) ILIKE 'null' THEN '[]'::jsonb
            ELSE cell_render_params::jsonb
        END AS cell_render_params

    FROM public.bp_store_attributes_metadata;
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
