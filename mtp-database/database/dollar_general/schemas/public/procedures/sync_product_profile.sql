--liquibase formatted sql
--changeset rajat.choudhary-1:sync_product_profile runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:0043
--comment: ph_code at product_code level
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_profile();
CREATE OR REPLACE PROCEDURE public.sync_product_profile()
LANGUAGE plpgsql
AS $procedure$
declare 
		_today int;
		_hies varchar;
		_hies_j varchar;
		_ph_hie_level int;
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_profile';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 
	SELECT EXTRACT(dow FROM CURRENT_DATE) into _today; 
	
	SELECT 	string_agg(generic_column_name, ', '), string_agg('''' || generic_column_name || '''' || ', ' || generic_column_name, ', '), 
	  		MAX(hierarchy_level) 
	INTO 	_hies, _hies_j, _ph_hie_level
	FROM (	SELECT generic_column_name,hierarchy_level 
		    FROM global.product_generic_schema_mapping 
		    WHERE hierarchy_level <= ( SELECT hierarchy_level FROM global.product_generic_schema_mapping WHERE generic_column_name = 'product_code') 
	    	ORDER BY 2 ASC
	  	 ) x;

	-- if _today = 1 then
	-- 	raise notice 'running historic';
		perform public.parellel_insert('WITH rows AS (
			DELETE FROM inventory_smart.product_profile_master {where} and special_classification = ''ia-recommended''
				RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'inventory_smart.product_profile_master where special_classification = ''ia-recommended'' ', 'pp_code', null, 50);
		raise notice 'Step 1: %', (clock_timestamp() - _st);

	   	perform public.parellel_insert(
	   'WITH rows 
	   	AS 
	   	(	INSERT INTO inventory_smart.product_profile_master (pp_code, "name", description, special_classification, ph_code)
			SELECT 	pp_code, "name",description,special_classification,
			  		(SELECT hierarchy_code 
					 FROM global.product_hierarchies_filter 
					 WHERE (path, level) = (jsonb_build_object(' || _hies_j || '), ' || _ph_hie_level || ') and active
					 ) as ph_code
			FROM	(	SELECT pp_code, product_description as name, product_code,special_classification, description 
						FROM public.product_profile
						{where}
						GROUP BY 1, 2, 3, 4, 5
			  		) pp
			JOIN global.product_attributes_filter paf USING(product_code)
			GROUP BY 1,2,3,4, ' || _hies || ' 
			RETURNING 1
		) 
		SELECT count(1) as cnt FROM rows;', 50, 'public.product_profile', 'pp_code', 'ppp_idx', 50);

	raise notice 'Step 2: %',(clock_timestamp() - _st);
--
	select async_query into _worker from public.async_query('call global.build_list_partitions(''product_profile_mapping'');');

	perform public.async_query_status(_worker, 'cleanup');
--
		perform public.parellel_insert(
		'WITH rows 
		 AS 
		 (	INSERT INTO inventory_smart.product_profile_mapping (pp_code,mapping_code,l0_name,size_level_proportion, overall_proportion, product_code, store_code) 
			SELECT pp_code,pmps.mapping_code,x.l0_name,size_level_proportion,overall_proportion,product_code,store_code 
			FROM (	SELECT pp_code, l0_name,size_level_proportion,overall_proportion, product_code, store_code  
					FROM public.product_profile 
					{where} 
				  ) x 
			LEFT JOIN global.product_mapping_product_store pmps using (product_code, store_code)
			JOIN inventory_smart.product_profile_master ppm USING(pp_code)
			RETURNING 1
		 ) 
		 SELECT count(1) as cnt FROM rows;', 50, 'public.product_profile', 'pp_code', 'ppp_idx', 50);
	raise notice 'Step 3: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;