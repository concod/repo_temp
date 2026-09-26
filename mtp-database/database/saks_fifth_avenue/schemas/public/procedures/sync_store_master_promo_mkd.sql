-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_store_master_promo_mkd_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_store_master_promo_mkd
-- comment: derived table for store master_v5

DROP  PROCEDURE if exists public.sync_store_master_promo_mkd();

CREATE OR REPLACE PROCEDURE public.sync_store_master_promo_mkd()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_master_promo_mkd';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE "global".tb_store_master;

	        INSERT INTO  "global".tb_store_master
	        (
          s0_id,
          s0_name,
          s1_id,
          s1_name,
          s2_id,
          s2_name,
          s3_id,
          s3_name,
          s4_id,
          s4_name,
          s5_id,
          s5_name,
          store_code,
          store_name,
          store_id,
          store_status,
          type,
          store_open_flag,
          active,
          is_active,
          special_classification,
          climate_area,
          latitude,
          longitude,
          open_date,
          close_date
	        )
			select
          cast(s0_id as int4) as s0_id,
          s0_name,
          cast(s1_id as int4) as s1_id,
          s1_name,
          cast(s2_id as int4) as s2_id,
          s2_name,
          cast(s3_id as int4) as s3_id,
          s3_name,
          cast(s4_id as int4) as s4_id,
          s4_name,
          cast(s5_id as int4) as s5_id,
          s5_name,
          cast(store_code as int4) as store_code,
          store_name,
          cast(store_id as int4) as store_id,
          store_status,
          type,
          store_open_flag,
          case when is_active = 1 then true else false end as active,
          is_active,
          special_classification,
          climate_area,
          cast(latitude as float8) as latitude,
          cast(longitude as float8) as longitude,
          cast(open_date as timestamp) as open_date,
          cast(close_date as timestamp) as close_date
			from public.store_master_promo_mkd
			group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26
		;
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