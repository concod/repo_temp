-- liquibase formatted sql
-- changeset shaik.azmathulla@impactanalytics.co:sync_dc_split_ratio runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_dc_split_ratio
-- comment: optimized the sync_dc_split_ratio sp.

DROP PROCEDURE IF EXISTS public.sync_dc_split_ratio;
CREATE OR REPLACE PROCEDURE public.sync_dc_split_ratio(IN _is_historic boolean DEFAULT false)
LANGUAGE plpgsql
AS $procedure$
declare 
	_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_split_ratio';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin

	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	PERFORM set_config('local.log_code', _log_code, true);
	PERFORM set_config('local.sp_name', _sp_name, true);
	
	BEGIN
		_log_step := 'truncate table';
		PERFORM set_config('local.log_step', _log_step, true);
		
		IF _is_historic THEN 
		
			SELECT async_query INTO _worker FROM public.async_query('truncate table inventory_smart.dc_split_ratio;');
			PERFORM public.async_query_status(_worker, 'cleanup');
		
		END IF;
			
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'get distinct article';
		PERFORM set_config('local.log_step', _log_step, true);
		
		SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.dc_split_ratio_temp ;');
		PERFORM public.async_query_status(_worker, 'cleanup');

		SELECT async_query INTO _worker 
		FROM public.async_query(' create table public.dc_split_ratio_temp as select article from public.dc_split_ratio group by article  order by article ;');
		PERFORM public.async_query_status(_worker, 'cleanup');

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'dc_split_ratio upsert';
		PERFORM set_config('local.log_step', _log_step, true);
		
		perform public.parellel_insert(
		' WITH rows 
		 AS 
		 (	
		 	INSERT INTO inventory_smart.dc_split_ratio(article, product_code, "size",loc_code,channel,fiscal_year_week, penetration )
			SELECT src.article, src.product_code, src."size", src.loc_code,src.channel,src.fiscal_year_week,src.penetration
			FROM public.dc_split_ratio AS src 
			{where} ON CONFLICT (product_code, loc_code, channel, fiscal_year_week)
			DO UPDATE 
			SET article=EXCLUDED.article, 
				"size"=EXCLUDED."size", 
				penetration=EXCLUDED.penetration		
			RETURNING 1
		  ) 
		  SELECT count(1) as cnt FROM rows;',50,'public.dc_split_ratio_temp','article','dc_split_ratio_temp_pk',50);
		 
		 CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
		 
	EXCEPTION
	
		WHEN OTHERS THEN
	        -- Log the error if an exception occurs during any part of the procedure
	        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;
	
	   CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	   
END;
$procedure$;