--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_rcl_dc_store runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:briscoes_sync_rcl_dc_store
--comment: initial changeset for sync_rcl_dc_store

DROP PROCEDURE IF EXISTS public.sync_rcl_dc_store();

CREATE OR REPLACE PROCEDURE public.sync_rcl_dc_store()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_dc_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
		_rcl_code int;
		_rcl_dt text;
		_rcl_jsonb text;
		_sql text;
    begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	    
		with cte as 
	    (
	    select * from 
	    	(select array_agg(rcl_dimension order by rcl_dimension)::varchar[] as level, rcl_code from  
			    (select jsonb_object_keys(concat('{"',
						            replace(replace(rcl_dimension,
						            '::',
						            '":"'),
						            ';;',
						            '","'),
						            '"}')::jsonb) as  rcl_dimension, rcl_code
						   		from public.dc_store_policy group by 1,2
						   )b group by 2 
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
				where module_code = 10003
				)b
				group by 2,3
			) s
			using(level)
--		join global.rcl_priority_mapping rpm using(level) where module_code = 10003
		)
			  		  
		insert into global.rcl_master 
		(rcl_code, module_code, "level", hierarchy_selections, validity, priority, is_deleted, created_by, updated_by, created_at, updated_at, rcl_lowest_level, is_default)
		select rcl_code, module_code, "level", '{}', '{[2024-01-01,2050-12-31)}', rcl_priority, false, 13, null, now(), null , null, true
		from cte  on conflict do nothing;
	
		RAISE NOTICE 'Step 1.1: rcl_code addition in rcl_master complete';

	    for _rcl_code, _rcl_dt, _rcl_jsonb in 
	    
	    select x.rcl_code
	    , string_agg(x.level || ' ' || y.generic_column_datatype, ', ')
	    , string_agg(quote_literal(x.level) || ', ' || x.level, ', ') 
	    from (select rcl_code, unnest(level) as level from global.rcl_master) x 
	    join global.product_generic_schema_mapping y 
	    on x.level = y.generic_column_name 
	    group by 1 
	    
	    loop
		   	execute '
				create temp table rcl_dc_store_policy_rule_' || _rcl_code || ' on commit drop as
				select 
					rcl_code,
					rule_name,
		            daterange(start_date, end_date) as validity,
					default_store_groups,
					jsonb_build_object(' || _rcl_jsonb || ') as rcl_dimension from (
						select concat(''{"'',
				            replace(replace(rcl_dimension,
				            ''::'',
				            ''":"''),
				            '';;'',
				            ''","''),
				            ''"}'')::jsonb as rcl_dimension,
					        rcl_code,
					        rule_name,
					        start_date::date as start_date,
					        end_date::date as end_date,
					        default_store_groups
				   		from public.dc_store_policy
				        where rcl_code = ' || _rcl_code || '
					) x, jsonb_to_record(rcl_dimension) as (' || _rcl_dt || ');';			   
					
			execute '
				insert
	            into
	            	inventory_smart.rcl_dc_store_policy_rule (rcl_code, rule_name, rcl_dimension)
		        select
		            rcl_code,
					rule_name,
		            rcl_dimension
		        from
		            rcl_dc_store_policy_rule_' || _rcl_code || '
		        on conflict do nothing;';
           
           execute '
				insert
	            into
	            	inventory_smart.rcl_dc_store_policy (rcl_code,
			            rule_code,
			            validity,
			            default_store_groups,
			            default_product_profile,
			            dc_store_rule,
						auto_allocation_rule,
						auto_allocation_schedular
			            )
		        select
		            rcl_code,
		            rule_code,
		            validity,
					ARRAY[default_store_groups]::integer[] AS default_store_groups,
		            NULL as default_product_profile,
		            NULL as dc_store_rule,
					NULL as auto_allocation_rule,
					NULL as auto_allocation_schedular
		        from rcl_dc_store_policy_rule_' || _rcl_code || '
		             x
		        join inventory_smart.rcl_dc_store_policy_rule y
		        	using(rcl_code, rcl_dimension)
		        on conflict do nothing;';
	    end loop;
	   
	   RAISE NOTICE 'Step 1.2: complete';
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
