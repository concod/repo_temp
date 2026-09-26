-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_day_split_mkd_v6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_day_split_mkd
-- comment: derived table for day_split_mkd_v6

DROP  PROCEDURE if exists public.sync_day_split_mkd();

CREATE OR REPLACE PROCEDURE public.sync_day_split_mkd()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_day_split_mkd';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		    drop table if exists price_markdown_opt.tb_day_split_mkd CASCADE;
			CREATE TABLE price_markdown_opt.tb_day_split_mkd (
				l3_cid int4 NULL,
				brand_cid int4 NULL,
				dates date NULL,
				week_start_date date NULL,
				day_ratio_bnm numeric NULL,
				day_ratio_ecom numeric null
			) PARTITION BY RANGE (dates);
			call price_promo_opt.pc_create_date_partitions('price_markdown_opt', 'tb_day_split_mkd', 'day', '55 week', 'forward');
			call price_promo_opt.pc_create_date_partitions('price_markdown_opt', 'tb_day_split_mkd', 'day', '2 week', 'backward');


	        INSERT INTO price_markdown_opt.tb_day_split_mkd
	        (
		    l3_cid,
		    brand_cid,
		    dates,
		    week_start_date,
		    day_ratio_bnm,
		    day_ratio_ecom
	        )

		  select
		    l3_cid,
		    brand_cid,
		    "date",
		    week_start_date,
		    bnm_day_split_ratio,
		    ecom_day_split_ratio
		  from public.day_split_mkd
		;
		CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_mkd ON
		price_markdown_opt.tb_day_split_mkd
		USING BTREE (l3_cid, brand_cid, week_start_date);
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