--liquibase formatted sql
--changeset ashish@impactanalytics.co:sync_fwos_sku_store_table runOnChange:true stripComments:false splitStatements:false context:parallel_insert labels:sync_fwos_sku_store_table
--comment: parallel insert for sync_fwos_sku_store_table
DROP PROCEDURE if exists public.sync_fwos_sku_store_table();
CREATE OR REPLACE PROCEDURE public.sync_fwos_sku_store_table()
 LANGUAGE plpgsql
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_fwos_sku_store_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_worker text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	select async_query into _worker from public.async_query('truncate inventory_smart.fwos_sku_store_table;');
	perform public.async_query_status(_worker, 'cleanup');
	select async_query into _worker from public.async_query('call global.build_list_partitions(''fwos_sku_store_table'');');
	perform public.async_query_status(_worker, 'cleanup');
	perform public.parellel_insert('WITH rows AS (
		INSERT INTO
		  inventory_smart.fwos_sku_store_table (
		    l0_name,
		    product_code,
		    store_code,
		    wos_oh_oo_it,
		    wos_oh_oo,
		    wos_oh_it,
		    wos_oh,
		    str_dc_wos,
		    dc_wos_oh,
		    dc_wos_oh_oo_it,
		    dc_wos_oh_oo,
		    str_inv,
		    str_oh,
		    str_oo_unt,
		    str_it,
		    str_oh_oo,
		    str_oh_it,
		    ata,
		    dc_oh,
		    dc_oo,
		    total_dc_inv,
		    tot_str_inv,
		    total_predicted_qty
		  )
		select
		  l0_name,
		  product_code,
		  store_code,
		  wos_oh_oo_it,
		  wos_oh_oo,
		  wos_oh_it,
		  wos_oh,
		  str_dc_wos,
		  dc_wos_oh,
		  dc_wos_oh_oo_it,
		  dc_wos_oh_oo,
		  str_inv,
		  str_oh,
		  str_oo_unt,
		  str_it,
		  str_oh_oo,
		  str_oh_it,
		  ata,
		  dc_oh,
		  dc_oo,
		  total_dc_inv,
		  tot_str_inv,
		  total_predicted_qty
		from
		  public.fwos_sku_store_table x join global.product_attributes_filter paf using(product_code) {where} RETURNING 1) 
	SELECT 
	  count(1) as cnt 
	FROM 
	  rows;', 50, 'public.fwos_sku_store_table', 'product_code', 'fwos_sst_idx', 2000);
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
