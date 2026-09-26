--liquibase formatted sql
--changeset shaik.azmathulla@impactanalytics.co:sync_product_profile_daily runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_product_profile_daily
--comment: optimization done for daily sp

DROP PROCEDURE IF EXISTS public.sync_product_profile_daily;
CREATE OR REPLACE PROCEDURE public.sync_product_profile_daily()
LANGUAGE 'plpgsql'
AS $procedure$
declare 
	_hies varchar;
	_hies_j varchar;
	_ph_hie_level int;
	_worker text;
	_st TIMESTAMP := clock_timestamp();
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_profile_daily';
	_log_step varchar;
BEGIN

	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	PERFORM set_config('local.log_code', _log_code, true);
	PERFORM set_config('local.sp_name', _sp_name, true);
	
	BEGIN
	
		SELECT 	string_agg(generic_column_name, ', '), string_agg('''' || generic_column_name || '''' || ', ' || generic_column_name, ', '), 
		  		MAX(hierarchy_level) 
		INTO 	_hies, _hies_j, _ph_hie_level
		FROM (	SELECT generic_column_name,hierarchy_level 
			    FROM global.product_generic_schema_mapping 
			    WHERE hierarchy_level <= ( SELECT hierarchy_level FROM global.product_generic_schema_mapping WHERE generic_column_name = 'product_code') 
		    	ORDER BY 2 ASC
		  	 ) x;

		_log_step := 'delete delta calculation';
		PERFORM set_config('local.log_step', _log_step, true);
		
		SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.product_profile_daily_temp;');
		PERFORM public.async_query_status(_worker, 'cleanup');
		
		SELECT async_query INTO _worker
		FROM public.async_query( 
		'CREATE TABLE public.product_profile_daily_temp AS 
		 SELECT DISTINCT a.pp_code
		 FROM inventory_smart.product_profile_mapping a
		 WHERE product_code IN (SELECT DISTINCT product_code FROM public.product_profile_daily);');
		PERFORM public.async_query_status(_worker, 'cleanup');
		
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'parelle delete';
		PERFORM set_config('local.log_step', _log_step, true);
		
		PERFORM public.parellel_insert(
			'WITH rows 
			 AS (
					DELETE FROM inventory_smart.product_profile_master 
					{where} AND special_classification = ''ia-recommended''
					RETURNING 1
				) SELECT count(1) as cnt FROM rows;',50,'public.product_profile_daily_temp','pp_code','product_profile_daily_temp_pk',50 );
	
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'product_profile_master parelle insert';
		PERFORM set_config('local.log_step', _log_step, true);
		PERFORM public.parellel_insert (
		'WITH
		    ROWS AS (
		    INSERT INTO inventory_smart.product_profile_master (
				  pp_code, name, description, special_classification, 
				  ph_code
				)
				SELECT 
				  pp_code, 
				  name, 
				  description, 
				  special_classification, 
				  (SELECT hierarchy_code 
							 FROM global.product_hierarchies_filter 
							 WHERE (path, level) = (jsonb_build_object(' || _hies_j || '), ' || _ph_hie_level || ') and active
				   ) as ph_code
				FROM 
				  (
				    SELECT 
				      pp_code, 
				      product_description as name, 
				      product_code,
				      special_classification,
				      description 
				    FROM 
				      public.product_profile_daily
					  {where}
				   GROUP BY 1, 2, 3, 4, 5
				  ) x 
				  join global.product_attributes_filter paf using(product_code) 
		   GROUP BY 1,2,3,4, ' || _hies || ' 
		     RETURNING 1)
		  SELECT COUNT(1) AS cnt FROM ROWS;',50,'public.product_profile_daily','pp_code','ppp_idx',50 );
		
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'create partition';
		PERFORM set_config('local.log_step', _log_step, true);
		
		SELECT async_query INTO _worker
		FROM public.async_query( 'call global.build_list_partitions(''product_profile_mapping'');');
		PERFORM public.async_query_status(_worker, 'cleanup');

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'product_profile_mapping parelle insert';
		PERFORM set_config('local.log_step', _log_step, true);
		
		PERFORM public.parellel_insert(
			'WITH rows AS (
					INSERT INTO inventory_smart.product_profile_mapping (
				  			pp_code, 
							mapping_code, 
							l0_name, 
							size_level_proportion, 
				  			overall_proportion, 
							product_code, 
				 			store_code
					) 
					SELECT pp_code,pmps.mapping_code,x.l0_name,size_level_proportion,overall_proportion,product_code,store_code
					FROM (	SELECT pp_code, l0_name,size_level_proportion,overall_proportion, product_code, store_code  
							FROM public.product_profile_daily  
							{where} 
						  ) x 
					LEFT JOIN global.product_mapping_product_store pmps using (product_code, store_code)
		          	JOIN inventory_smart.product_profile_master ppm USING(pp_code)
					RETURNING 1
					) 
					SELECT count(1) as cnt FROM rows;',50,'public.product_profile_daily','pp_code','ppp_idx',50);
		
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
