--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_product_time_attributes_v4 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-520
--comment: Optimized async query in sync_product_time_attributes
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_time_attributes();
CREATE OR REPLACE PROCEDURE public.sync_product_time_attributes()
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_time_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		select async_query into _worker from public.async_query('call global.build_list_partitions(''product_time_attributes'')');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice '	Step 1: %', (clock_timestamp() - _st);
		select async_query into _worker from public.async_query('
		delete from global.product_time_attributes pta
		where not exists (select 1 from "global".product_attributes_filter paf where paf.product_code = pta.product_code and is_deleted = false and main_sku_tag = true and clearance = false)
		;
		');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice '	Step 2: %', (clock_timestamp() - _st);
 		perform public.parellel_insert('WITH rows AS (
    	INSERT INTO global.product_time_attributes
        (product_code, attribute_name, attribute_value, start_time, end_time, l0_name, updated_at, updated_by)
	    SELECT DISTINCT
        s.product_code,
        attribute_name,
        attribute_value,
        cast(season_start_date as date),
        cast(season_end_date as date),
        paf.l0_name,
        paf.updated_at,
        paf.updated_by::int AS updated_by
    	FROM
        public.productseason_validated_table s
        JOIN global.product_attributes_filter paf USING (product_code) 
		{where} 
		ON CONFLICT (product_code, attribute_name, l0_name, start_time) DO
    	UPDATE
    	SET
        attribute_value = EXCLUDED.attribute_value
		RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.productseason_validated_table', 'product_code', 'ppsvt_idx', 500);
 		raise notice 'Step2: %', (clock_timestamp() - _st);
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