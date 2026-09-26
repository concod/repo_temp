--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:instock_kpi_table_filters_added runOnChange:true stripComments:false splitStatements:false context:MTP-35067 labels:MTP-35067
--comment: added coord group desc and source code from MTP-27061
--rollback: SELECT 1

DROP procedure IF EXISTS public.sync_instock_kpi_table();
DROP PROCEDURE IF EXISTS public.sync_instock_kpi_table(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_instock_kpi_table(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_instock_kpi_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if _is_historic then 
	 		select async_query into _worker from public.async_query('truncate table inventory_smart.instock_kpi_table;');
			perform public.async_query_status(_worker, 'cleanup');
			raise notice 'Step1: %', (clock_timestamp() - _st);
 		end if;
		perform public.parellel_insert('WITH rows AS (
		  insert into inventory_smart.instock_kpi_table (
			  oh_flag, date, l0_name, l1_name, l2_name, 
			  l3_name, l4_name, pfs_season, pfs_year, 
			  dtc_season, dtc_year, brand, channel, 
			  state, district, climate, country, 
			  city, region, s1_name, s2_id, s3_name, 
			  s4_name, store_group, product_group,rtl_coordinate_group_desc,source_code
			) 
			select 
			  oh_flag, 
			  date, 
			  l0_name, 
			  l1_name, 
			  l2_name, 
			  l3_name, 
			  l4_name, 
			  pfs_season, 
			  pfs_year, 
			  dtc_season, 
			  dtc_year, 
			  brand, 
			  channel, 
			  state, 
			  district, 
			  climate, 
			  country, 
			  city, 
			  region, 
			  s1_name, 
			  s2_id, 
			  s3_name, 
			  s4_name, 
			  store_group, 
			  product_group,rtl_coordinate_group_desc,source_code
			from 
			  public.instock_kpi_table {where} RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.instock_kpi_table', 'l4_name', 'ins_kpi_l4_idx');
		raise notice 'Step2: %', (clock_timestamp() - _st);
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
