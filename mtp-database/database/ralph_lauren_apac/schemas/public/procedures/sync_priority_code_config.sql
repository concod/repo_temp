--liquibase formatted sql
--changeset dushant.raut:alerts_product_store_level_instore_date_handling_2 runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-36140
--comment: 	replaced date with instore_date
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_priority_code_config();
CREATE OR REPLACE PROCEDURE public.sync_priority_code_config()
LANGUAGE 'plpgsql'
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_priority_code_config';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_worker text;
BEGIN

	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	PERFORM set_config('local.log_code', _log_code, true);
	PERFORM set_config('local.sp_name', _sp_name, true);

	BEGIN

		_log_step := 'create partitions';
		PERFORM set_config('local.log_step', _log_step, true);
		
		SELECT async_query INTO _worker FROM public.async_query( 'call global.build_list_partitions ( ''priority_code_configuration'') ;' );
		PERFORM public.async_query_status(_worker, 'cleanup');

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
		
		_log_step := 'parellel insert';
		PERFORM set_config('local.log_step', _log_step, true);
		
		perform public.parellel_insert(
		'WITH rows 
		AS (
			insert into inventory_smart.priority_code_configuration(article,store_code,channel,l0_name) 
			select distinct article,store_code,channel,l0_name 
			from inventory_smart.article_status_tag ast 
			join "global".store_attributes_filter saf using(channel)
			join "global".product_attributes_filter paf using(product_code)
			{where} and saf.active and paf.active
			ON CONFLICT (article,store_code,l0_name) do nothing
			RETURNING 1
		   ) SELECT count(1) as cnt FROM rows;', 50, 'inventory_smart.article_status_tag', 'product_code', null, 500);
		   
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'update delta calculation';
		PERFORM set_config('local.log_step', _log_step, true);
		
		SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.priority_code_configuration_temp ;');
		PERFORM public.async_query_status(_worker, 'cleanup');

		SELECT async_query INTO _worker 
		FROM public.async_query(
		'CREATE TABLE public.priority_code_configuration_temp AS 
		 select article
		 from inventory_smart.priority_code_configuration
		 where instore_date < current_date
		 group by article ;');
		PERFORM public.async_query_status(_worker, 'cleanup');
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
		
		_log_step := 'parellel update';
		PERFORM set_config('local.log_step', _log_step, true);
				perform public.parellel_insert(
		'WITH rows 
		AS (
			UPDATE inventory_smart.priority_code_configuration a
			SET customer_req_attr = b.customer_req_attr 
			FROM public.customer_req_attribute b
			{where} and a.article = b.article_pcc 
			RETURNING 1
			) SELECT count(1) as cnt FROM rows;', 50, 'public.priority_code_configuration_temp', 'article', 'priority_code_configuration_temp_pk', 500);
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
				perform public.parellel_insert(
		'WITH rows 
		AS (
			UPDATE inventory_smart.priority_code_configuration a
			SET priority_code = b.priority_code,
				updated_by = b.updated_by,
				updated_at = b.updated_at,
				upload_flag = b.upload_flag
			FROM public.priority_code_update b
			{where} and a.article = b.article_pcc  and a.store_code = b.store_code 
			RETURNING 1
			) SELECT count(1) as cnt FROM rows;', 50, 'public.priority_code_configuration_temp', 'article', 'priority_code_configuration_temp_pk', 500);
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);		
		perform public.parellel_insert(
		'WITH rows 
		AS (
			UPDATE inventory_smart.priority_code_configuration 
			SET instore_date = current_date 
			{where} and instore_date < current_date
			RETURNING 1
			) SELECT count(1) as cnt FROM rows;', 50, 'public.priority_code_configuration_temp', 'article', 'priority_code_configuration_temp_pk', 500);
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
	EXCEPTION
	
		WHEN OTHERS THEN
	        -- Log the error if an exception occurs during any part of the procedure
	        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;
	
	   CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);   
	   
END
$procedure$;