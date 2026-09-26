--liquibase formatted sql
--changeset himansh.bhardwaj@impactanalytics.co:changed the public table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:figs_sync_rcl_psm
--comment: changed the public table
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_rcl_psm(bool);

CREATE OR REPLACE PROCEDURE public.sync_rcl_psm(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
		_rcl_code int;
		_rcl_dt text;
		_rcl_jsonb text;
		_sql text;
	-------------------If historic delete data from 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_psm';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if _is_historic then 
			 		delete from 
			 		  "global".rcl_product_mapping_product_store_rule;
			 		 raise notice 'rcl_product_mapping_product_store_rule deleted : %', (clock_timestamp() - _st);
			 		 
 			 		delete from 
			 		  "global".rcl_master where rcl_code in (select distinct rcl_code from public.rule_store_mapping_validated_table);
			 		 raise notice 'rcl_code deleted : %', (clock_timestamp() - _st);
			 		 
					raise notice 'Step1: %', (clock_timestamp() - _st);
	 			
	 		end if;
 		
 	------------------Insert default rcl in rcl_master
	    
		with cte as 
		(
		select * from 
			(select array_agg(rcl_dimension order by rcl_dimension)::varchar[] as level, rcl_code, rcl_lowest_level from  
			    (select jsonb_object_keys(concat('{"',
						            replace(replace(rcl_dimension,
						            '::',
						            '":"'),
						            ';;',
						            '","'),
						            '"}')::jsonb) as  rcl_dimension, rcl_code, rcl_lowest_level::VARCHAR[]
						   		from public.rule_store_mapping_validated_table  group by 1,2,3
						   )b group by 2 ,3
			)r
			join 
			(
			select array_agg(exploded_level order by module_code, rcl_priority, exploded_level)::varchar[] as level, rcl_priority, module_code
			from			   					   		
				(
				SELECT 
					unnest("level") AS exploded_level,
					rcl_priority,
					module_code
				FROM "global".rcl_priority_mapping
				where module_code = 101
				)b
				group by 2,3
			) s
			using(level)
		--global.rcl_priority_mapping rpm using(level) where module_code = 101
		)
			  		  
		insert into global.rcl_master 
		(rcl_code, module_code, "level", hierarchy_selections, validity, priority, is_deleted, created_by, updated_by, created_at, updated_at, rcl_lowest_level, is_default)
		select rcl_code, module_code, "level", '{}', '{[2024-01-01,2050-12-31)}', rcl_priority, false, 1, null, now(), null , rcl_lowest_level, true
		from cte
		on conflict do nothing;

		delete from global.rcl_product_mapping_product_store
		where true;	
	    
	    RAISE NOTICE 'Step 1.1: rcl_code addition in rcl_master complete';
	    
	    for _rcl_code, _rcl_dt, _rcl_jsonb in 
	    
	    select x.rcl_code, 
	    string_agg(x.level || ' ' || y.generic_column_datatype, ', '), 
	    string_agg(quote_literal(x.level) || ', ' || x.level, ', ') 
	    from (select rcl_code, unnest(level) as level from global.rcl_master) x 
	    join global.product_generic_schema_mapping y 
	    on x.level = y.generic_column_name 
	    group by 1 
	    
	    loop
		   	execute '
				create temp table rcl_psm_master_rule_' || _rcl_code || ' on commit drop as
				select 
					rcl_code,
					psa_code,
		            psa_name,
		            validity,
					jsonb_build_object(' || _rcl_jsonb || ') as rcl_dimension from (
						select concat(''{"'',
				            replace(replace(rcl_dimension,
				            ''::'',
				            ''":"''),
				            '';;'',
				            ''","''),
				            ''"}'')::jsonb as rcl_dimension,
							rcl_code,
							psa_code,
				            psa_name,
							range_agg(daterange(start_date::date,
				            end_date::date,$$[]$$)) as validity
--				   		from public.rule_store_mapping_delta
						from public.rule_store_mapping_validated_table
				        where rcl_code = ' || _rcl_code || '
						group by rcl_dimension, rcl_code, psa_code, psa_name
					) x, jsonb_to_record(rcl_dimension) as (' || _rcl_dt || ');';
			execute '
				insert
	            into
	            	global.rcl_product_mapping_product_store_rule (rcl_code, rcl_dimension)
		        select
		            rcl_code,
		            rcl_dimension
		        from
		            rcl_psm_master_rule_' || _rcl_code || '
		        on conflict do nothing;';
           execute '
				insert
	            into
	            	global.rcl_product_mapping_product_store (rcl_code,
			            rule_code,
			            psa_code,
			            psa_name,
			            validity)
		        select
		            rcl_code,
		            rule_code,
		            psa_code,
		            psa_name,
		            validity
		        from rcl_psm_master_rule_' || _rcl_code || '
		             x
		        join global.rcl_product_mapping_product_store_rule y
		        	using(rcl_code, rcl_dimension)
		        on conflict(rcl_code,rule_code,psa_code) do update set psa_name = excluded.psa_name, validity=excluded.validity, updated_at = now();';
	    end loop;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
    end
$procedure$ 
;
