--liquibase formatted sql
--changeset sri.harsha:sync_rcl_constraint runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_rcl_constraint
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_rcl_constraint();
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
	    with cte as (select * from (select array_agg(rcl_dimension order by rcl_dimension)::varchar[] as level, rcl_code from  (select jsonb_object_keys(concat('{"',
				            replace(replace(rcl_dimension,
				            '::',
				            '":"'),
				            ';;',
				            '","'),
				            '"}')::jsonb) as  rcl_dimension, rcl_code
				   		from public.constraint_master group by 1,2
				   )b group by 2 )r
				  join global.rcl_priority_mapping rpm using(level) where module_code = 170)
insert into global.rcl_master select rcl_code, 170, "level", '{}', '{[2022-07-01,2050-12-31)}', rcl_priority, false, 1, null, now(), null 
	    								from cte  on conflict do nothing;
	    for _rcl_code, _rcl_dt, _rcl_jsonb in select x.rcl_code, string_agg(x.level || ' ' || y.generic_column_datatype, ', '), string_agg(quote_literal(x.level) || ', ' || x.level, ', ') from (select rcl_code, unnest(level) as level from global.rcl_master) x join global.product_generic_schema_mapping y on x.level = y.generic_column_name group by 1 loop
		   	execute '
				create temp table rcl_constraint_master_rule_' || _rcl_code || ' on commit drop as
				select 
					rcl_code,
					rule_name,
					psa_code,
		            daterange(start_date, end_date) as validity,
		            wos,
		            min,
		            max,
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
							psa_code,
							start_date::date as start_date,
				            end_date::date as end_date,
				            wos,
				            min,
				            max
				   		from public.constraint_master
				        where rcl_code = ' || _rcl_code || '
					) x, jsonb_to_record(rcl_dimension) as (' || _rcl_dt || ');';
			execute '
				insert
	            into
	            	inventory_smart.rcl_constraint_master_rule (rcl_code, rule_name, rcl_dimension)
		        select
		            rcl_code,
					rule_name,
		            rcl_dimension
		        from
		            rcl_constraint_master_rule_' || _rcl_code || '
		        on conflict do nothing;';
           
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