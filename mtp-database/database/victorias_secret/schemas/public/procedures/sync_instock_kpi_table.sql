--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_instock_kpi_table_v4 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-215
--comment: adding dc level metrics to the SP in KPIs
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_instock_kpi_table();
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
  	article ,
  	store_code ,
    store_flag ,
  	size_integrity_oh ,
  	size_integrity_oh_oo_it ,
  	oh ,
  	oo ,
  	it ,
  	last_week_sales ,
  	last_4_week_sales ,
  	last_8_week_sales ,
  	wos_oh ,
  	wos_oh_it ,
  	wos_oh_it_oo ,
  	accuracy_bucket ,
  	wip ,
  	store_tier ,
  	store_name ,
  	location_hierarchy_region_code,
  	s1_name,
  	s3_name,
  	s4_name,
  	l0_name,
  	l2_name,
  	l3_name,
  	l4_name,
  	l5_name,
  	l6_name,
  	channel,
  	collection,		
	masterstyle_descr,			
	subbrand_code_desc,			
	product_lifecycle,
	oh_dc,
	oo_dc,
	it_dc,
	dc_size_integrity_oh,
	dc_size_integrity_oh_oo_it
  	)
	select 
  	article ,
  	store_code ,
    store_flag ,
  	size_integrity_oh ,
  	size_integrity_oh_oo_it ,
  	oh ,
  	oo ,
  	it ,
  	lw_sales ,
  	last_4_week_sales ,
  	last_8_week_sales ,
  	wos_oh ,
  	wos_oh_it ,
  	wos_oh_it_oo ,
  	accuracy_bucket ,
  	wip ,
  	store_tier ,
  	store_name ,
  	location_hierarchy_region_code,
  	s1_name,
  	s3_name,
  	s4_name,
  	l0_name,
  	l2_name,
  	l3_name,
  	l4_name,
  	l5_name,
  	l6_name,
  	channel,
  	collection,		
	masterstyle_descr,			
	subbrand_code_desc,			
	product_lifecycle,
	oh_dc,
	oo_dc,
	it_dc,
	dc_size_integrity_oh,
	dc_size_integrity_oh_oo_it
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
