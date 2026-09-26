--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_rcl_constraint runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:briscoes_sync_rcl_constraint
--comment: initial changeset for sync_rcl_constraint

 DROP PROCEDURE IF EXISTS public.sync_rcl_constraint();


CREATE OR REPLACE PROCEDURE public.sync_rcl_constraint()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_constraint';
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
	    drop table if exists public.cte;
	    
	    CREATE TABLE public.cte AS 
	    (
	    with cte_intermediate as 
	    (
	    select * from 
		    (select array_agg(rcl_dimension order by rcl_dimension)::varchar[] as level, rcl_code,is_default from  
			    (select jsonb_object_keys(concat('{"',
						            replace(replace(rcl_dimension,
						            '::',
						            '":"'),
						            ';;',
						            '","'),
						            '"}')::jsonb) as  rcl_dimension, rcl_code
						            ,is_default
						   		from public.constraint_master group by 1,2,3
						   )b group by 2,3
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
				where module_code = 170
				)b
				group by 2,3
			) s
			using(level)
--		global.rcl_priority_mapping rpm using(level) where module_code = 170
		)
		select * from cte_intermediate
		);
	
		delete from inventory_smart.rcl_constraint_master_exceptions 
		where rcl_code in (select distinct rcl_code from public.cte);
		RAISE NOTICE 'Step 1.1: Delete from rcl_constraint_master_rule';
	
		delete from inventory_smart.rcl_constraint_master 
		where rcl_code in (select distinct rcl_code from public.cte);
		RAISE NOTICE 'Step 1.2: Delete from rcl_constraint_master';
		
		delete from inventory_smart.rcl_constraint_master_rule 
		where rcl_code in (select distinct rcl_code from public.cte);
		RAISE NOTICE 'Step 1.1: Delete from rcl_constraint_master_rule';
	
		delete from global.rcl_master 
		where rcl_code in (select distinct rcl_code from public.cte);
		RAISE NOTICE 'Step 1.3: Delete from rcl_master';
	
			  		  
		insert into global.rcl_master 
		(rcl_code, module_code, "level", hierarchy_selections, validity, priority, is_deleted, created_by, updated_by, created_at, updated_at, rcl_lowest_level, is_default)
		select rcl_code, module_code, "level", '{}', '{[2024-01-01,2050-12-31)}', rcl_priority, false, 13, null, now(), null , null, is_default
		from public.cte  on conflict do nothing;
	    
	    RAISE NOTICE 'Step 1.4: rcl_code addition in rcl_master complete';
	    
	    for _rcl_code, _rcl_dt, _rcl_jsonb in 
	    
	    select x.rcl_code
	    , string_agg(x.level || ' ' || y.generic_column_datatype, ', ')
	    , string_agg(quote_literal(x.level) || ', ' || x.level, ', ') 
	    from (select rcl_code, unnest(level) as level from global.rcl_master) x 
	    join global.product_generic_schema_mapping y 
	    on x.level = y.generic_column_name group by 1 
	    
	    loop
		   	execute '
				create temp table rcl_constraint_master_rule_' || _rcl_code || ' on commit drop as
				select 
					rcl_code,
					psa_code,
		            daterange(start_date, end_date) as validity,
		            wos,
		            min,
		            max,
					rule_name,
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
							start_date::date as start_date,
				            end_date::date as end_date,
				            wos,
				            min,
				            max,
							rule_name
				   		from public.constraint_master
				        where rcl_code = ' || _rcl_code || '
					) x, jsonb_to_record(rcl_dimension) as (' || _rcl_dt || ');';
			execute '
				insert
	            into
	            	inventory_smart.rcl_constraint_master_rule (rcl_code, rcl_dimension, rule_name)
		        select
		            rcl_code,
		            rcl_dimension,
					rule_name
		        from
		            rcl_constraint_master_rule_' || _rcl_code || '
		        on conflict do nothing ;';
           
           execute '
				insert
	            into
	            	inventory_smart.rcl_constraint_master (rcl_code,
			            rule_code,
			            psa_code,
			            validity,
			            wos,
			            min_stock,
			            max_stock
						)
		        select
		            rcl_code,
		            rule_code,
		            psa_code,
		            validity,
		            wos,
		            min,
		            max
		        from rcl_constraint_master_rule_' || _rcl_code || '
		             x
		        join inventory_smart.rcl_constraint_master_rule y
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