--liquibase formatted sql
--changeset liquibase:sync_forecast_report_historic runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_forecast_report_historic
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_forecast_report_historic();

create or replace procedure public.sync_forecast_report_historic()
	language plpgsql
	security definer
	as $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_forecast_report_historic';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	partition_stmt varchar;
	partition_name varchar;

begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
	for partition_stmt,partition_name in 
		select
	'create table inventory_smart.forecast_report_' || from_fiscal_year_week || ' partition of inventory_smart.forecast_report for values from  (' || from_fiscal_year_week || ') to (' || to_fiscal_year_week || ');'
	partition_statement ,
	'forecast_report_' || from_fiscal_year_week as partition_name
    from 
        (
        select
            distinct fiscal_year_week from_fiscal_year_week,
            fiscal_year_week + 1 to_fiscal_year_week
        from
            global.fiscal_date_mapping fdm
        where
            fdm."date" > '31-Jan-2018'
        order by
            1
        limit 520) x
    where
        not exists (
        select
            'p'
        from
            pg_inherits
        join pg_class parent on
            pg_inherits.inhparent = parent.oid
        join pg_class child on
            pg_inherits.inhrelid = child.oid
        join pg_namespace nmsp_parent on
            nmsp_parent.oid = parent.relnamespace
        join pg_namespace nmsp_child on
            nmsp_child.oid = child.relnamespace
        where
            parent.relname in ('forecast_report')
                and child.relname = 'forecast_report_' || from_fiscal_year_week)
        loop 
            execute partition_stmt;
        end loop;

    --execute 'ALTER TABLE inventory_smart.forecast_report SET unlogged;';

insert
	into
	inventory_smart.forecast_report (	  
    product_code,
	fiscal_year_week,
	actual_discount_percentage, 
    planned_discount_percentage,
	actual_sales, 	  
    ia_forecast,
	adjusted_forecast, 	  
    multiplier,
	adjusted_forecast_error, 	  
    ia_forecast_error,
	count_store	) 	
		select 	  
        product_code, 
		fiscal_year_week, 
		actual_discount_percentage,
		planned_discount_percentage, 
		actual_sales,
		ia_forecast, 
		adjusted_forecast, 
		multiplier,
		adjusted_forecast_error,
		ia_forecast_error, 
		count_store
        from 	  
        public.forecast_report dt;

    --execute 'ALTER TABLE inventory_smart.forecast_report SET logged;';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$ ;

