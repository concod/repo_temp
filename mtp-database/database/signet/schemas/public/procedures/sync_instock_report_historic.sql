--liquibase formatted sql
--changeset liquibase:sync_instock_report_historic runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_instock_report_historic
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_instock_report_historic();
CREATE OR REPLACE PROCEDURE public.sync_instock_report_historic()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_instock_report_historic';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_table_name text :='instock_report';
	partition_stmt varchar;

	partition_name varchar;

begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
	
	--- To create missing partition
	for partition_stmt, partition_name in 
		select
	'create table inventory_smart.'||_table_name ||'_'||from_fiscal_year_week || ' partition of inventory_smart.'||_table_name||' for values from  (' || from_fiscal_year_week || ') to (' || to_fiscal_year_week || ');'
	partition_statement ,
	_table_name || from_fiscal_year_week as partition_name
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
		parent.relname in (_table_name)
			and child.relname = _table_name ||'_'|| from_fiscal_year_week)
	loop 
		execute partition_stmt;
	end loop;

--execute 'ALTER TABLE inventory_smart.instock_report SET unlogged;';

INSERT INTO inventory_smart.instock_report (
	  fiscal_year_week, store_code, product_code, 
	  dc_to_store_replenishment, instock_exclusion_list, 
	  combined_inclusion, min, max, model_stock, 
	  oh, it, adjusted_forecast_qty, sales_units, 
	  adjusted_error, instock_oh_count, 
	  instock_oh_percentage, instock_oh_count_ly, 
	  instock_oh_percentage_ly, instock_oh_it_count, 
	  instock_oh_it_percentage, instock_oh_it_count_ly, 
	  instock_oh_it_percentage_ly
	) 
	select 
	  fiscal_year_week, 
	  store_code, 
	  product_code, 
	  dc_to_store_replenishment, 
	  instock_exclusion_list, 
	  combined_inclusion, 
	  min, 
	  max, 
	  model_stock, 
	  oh, 
	  it, 
	  adjusted_forecast_qty, 
	  sales_units, 
	  adjusted_error, 
	  instock_oh_count, 
	  instock_oh_percentage, 
	  instock_oh_count_ly, 
	  instock_oh_percentage_ly, 
	  instock_oh_it_count, 
	  instock_oh_it_percentage, 
	  instock_oh_it_count_ly, 
	  instock_oh_it_percentage_ly 
	FROM 
	  public.instock_report dt 
	  join global.store_master sm using(store_code) 
	  join global.product_master pm using(product_code) ;
	 

--execute 'ALTER TABLE inventory_smart.instock_report SET logged;';
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
