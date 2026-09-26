--liquibase formatted sql
--changeset liquibase:sync_model_stock_deep_dive_historic runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_model_stock_deep_dive_historic
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_model_stock_deep_dive_historic();
CREATE OR REPLACE PROCEDURE public.sync_model_stock_deep_dive_historic()
 LANGUAGE plpgsql
 SECURITY definer
 AS $procedure$
Declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_model_stock_deep_dive_historic';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	
	_table_name text :='model_stock_deep_dive';
	partition_stmt varchar;

	partition_name varchar;

begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	--execute 'ALTER TABLE inventory_smart.model_stock_deep_dive SET logged;';
	
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

	INSERT INTO inventory_smart.model_stock_deep_dive (
	  store_code, product_code, fiscal_year_week, 
	  dma, vpro, sub_sku_division, store_avail_oh_actuals, 
	  store_avail_it_actuals, model_stock, 
	  predicted_qty, adjusted_forecast_qty, 
	  min, max, wos, constrained_flag, sales, 
	  model_stock_minus_min_stock, adjusted_forecast_qty_minus_max_stock, 
	  current_in_stock_percentage
	) 
	SELECT 
	  store_code, 
	  dt.product_code, 
	  fiscal_year_week, 
	  dma, 
	  vpro, 
	  sub_sku_division, 
	  store_avail_oh_actuals, 
	  store_avail_it_actuals, 
	  model_stock, 
	  predicted_qty, 
	  adjusted_forecast_qty, 
	  min, 
	  max, 
	  wos, 
	  constrained_flag, 
	  sales, 
	  model_stock_minus_min_stock, 
	  adjusted_forecast_qty_minus_max_stock, 
	  current_in_stock_percentage 
	FROM 
	  public.model_stock_deep_dive dt 
	  join global.store_master sm using(store_code) 
	  join global.product_master pm using(product_code);
	 
	--execute 'ALTER TABLE inventory_smart.model_stock_deep_dive SET logged;'; 

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
