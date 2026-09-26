--liquibase formatted sql
--changeset aman_lakkoju:Added lw_st and dc_wos_oh columns runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added lw_st and dc_wos_oh columns
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_instock_kpi_table();
CREATE OR REPLACE PROCEDURE public.sync_instock_kpi_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_instock_kpi_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	delete from 
		  inventory_smart.instock_kpi_table
		where 
		  true;	
	insert into inventory_smart.instock_kpi_table (
	article,
	store_code,
	channel,
	l0_name,
	l1_name,
	l2_name,
	l3_name,
	l4_name,
	l5_name,
	oh,
	oo,
	it,
	lw_st,
  	last_week_sales,
  	last_4_week_sales,
  	last_8_week_sales,
	size_integrity,
	dc_size_integrity_oh,
	dc_size_integrity_oh_oo_it,
	wos_oh,
	dc_wos_oh,
	wos_oh_it,
	wos_oh_it_oo,
	oh_dc,
	oo_dc,
	it_dc,
	store_flag
  	)
	select 
  	article,
store_code,
channel,
l0_name,
l1_name,
l2_name,
l3_name,
l4_name,
l5_name,
oh,
oo,
it,
lw_st,
sales_1_ago,
sales_4_ago,
sales_8_ago,
size_integrity,
dc_size_integrity_oh,
dc_size_integrity_oh_oo_it,
wos_oh,
dc_wos_oh,
wos_oh_it,
wos_oh_it_oo,
oh_dc,
oo_dc,
it_dc,
store_flag

	from public.instock_kpi_table ;
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