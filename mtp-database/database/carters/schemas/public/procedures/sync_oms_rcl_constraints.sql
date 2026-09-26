-- liquibase formatted sql
-- changeset pradeep.kumar@impactanalytics.co:final_changes runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:final_changes
-- comment: making final changes in SP

DROP PROCEDURE IF EXISTS public.sync_oms_rcl_constraints();

CREATE OR REPLACE PROCEDURE public.sync_oms_rcl_constraints()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_rcl_constraints';
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
	    with cte as (
			select * 
			from (
				select 
					array_agg(rcl_dimension order by rcl_dimension)::varchar[] as level,
					rcl_code 
				from  (
					select jsonb_object_keys(concat('{"',replace(replace(rcl_dimension,'::','":"'),';;','","'),'"}')::jsonb) as  rcl_dimension,
						   rcl_code
					from public.oms_constraint_master 
					group by 1,2
				)b 
				group by 2 
			)r
			join global.rcl_priority_mapping rpm using(level) 
			where module_code = 7001
		)
		insert into global.rcl_master 
			select
				rcl_code,
				7001,
				"level",
				'{}',
				'{[2022-07-01,2050-12-31)}',
				rcl_priority,
				false,
				112,
				null,
				now(),
				null 
			from cte  
			on conflict do nothing;
	    for _rcl_code, _rcl_dt, _rcl_jsonb in 
			select 
				x.rcl_code,
				string_agg(x.level || ' ' || y.generic_column_datatype, ', '),
				string_agg(quote_literal(x.level) || ', ' || x.level, ', ')
			from (select rcl_code, unnest(level) as level from global.rcl_master) x 
			join global.product_generic_schema_mapping y 
			on x.level = y.generic_column_name 
			group by 1 loop
		execute '
				create temp table rcl_oms_constraint_master_rule_' || _rcl_code || ' on commit drop as
					    select rcl_code,
					        rule_name,
					        daterange(start_date, end_date) as validity,
					        cast(min_replenishment_quantity as float4) as min_replenishment_quantity,
					        cast(max_replenishment_quantity as float4) as max_replenishment_quantity,
					        cast(order_multiple as float8) as order_multiple,
					        cast(column_modified as varchar) as column_modified,
					        cast(moq_interval as varchar) as moq_interval,
					        cast(moq_tolerance as float4) as moq_tolerance,
					        cast(moq_start_month as varchar) as moq_start_month,
					        cast(level_of_application as varchar) as level_of_application,
					        jsonb_build_object(' || _rcl_jsonb || ') as rcl_dimension from (
						select concat(''{"'',
				            replace(replace(rcl_dimension,
				            ''::'',
				            ''":"''),
				            '';;'',
				            ''","''),
				            ''"}'')::jsonb as rcl_dimension,
							cast(rcl_code as int4) as rcl_code,
							cast(null as varchar) as rule_name,
							start_date::date as start_date,
				            end_date::date as end_date,
							cast(min_replenishment_quantity as float4) as min_replenishment_quantity,
							cast(max_replenishment_quantity as float4) as max_replenishment_quantity,
                            cast(order_multiple as float8) as order_multiple,
                            cast(null as varchar(50)) as column_modified,
							cast(moq_interval as varchar) as moq_interval,
							cast(moq_tolerance as float4) as moq_tolerance,
							cast(moq_start_month as varchar) as moq_start_month,
							cast(level_of_application as varchar) as level_of_application
				   		from public.oms_constraint_master
				        where rcl_code = ' || _rcl_code || '
					) x, jsonb_to_record(rcl_dimension) as (' || _rcl_dt || ');';
			execute '
				insert
	            into
	            	inventory_smart.rcl_oms_constraint_master_rule (rcl_code, rule_name, rcl_dimension)
		        select
		            rcl_code,
					rule_name,
		            rcl_dimension
		        from
		            rcl_oms_constraint_master_rule_' || _rcl_code || '
		        on conflict do nothing;';
           
           execute ' 
					insert 
					into 
					inventory_smart.rcl_oms_constraint_master (rcl_code, 
					rule_code, 
					validity, 
					min_replenishment_quantity, 
					max_replenishment_quantity, 
					order_multiple, 
					moq_interval, 
					moq_tolerance, 
					moq_start_month, 
					column_modified, 
					level_of_application, 
					created_at,  
					created_by 
					) 
					select 
					rcl_code, 
					rule_code, 
					validity, 
					min_replenishment_quantity , 
					max_replenishment_quantity , 
					order_multiple, 
					moq_interval, 
					cast(moq_tolerance as float4) as moq_tolerance, 
					moq_start_month, 
					column_modified,  
					level_of_application, 
					now() as created_at, 
					112 as created_by  
					from rcl_oms_constraint_master_rule_' || _rcl_code || ' x 
					join inventory_smart.rcl_oms_constraint_master_rule y 
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