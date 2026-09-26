-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_store_split_mkd_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_store_split_mkd
-- comment: derived table for tb_store_split_mkd_v5

DROP  PROCEDURE if exists public.sync_store_split_mkd();

CREATE OR REPLACE PROCEDURE public.sync_store_split_mkd()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_split_mkd';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		    drop table if exists price_markdown_opt.tb_store_split_mkd CASCADE;
			CREATE TABLE price_markdown_opt.tb_store_split_mkd (
				product_id int4 NULL,
				store_id int4 NULL,
				s0_id int4 NULL,
				s1_id int4 NULL,
				week_start_date date NULL,
				store_ratio numeric NULL
			) PARTITION BY RANGE (week_start_date);
			call price_promo_opt.pc_create_date_partitions('price_markdown_opt', 'tb_store_split_mkd', 'week', '28 week', 'forward');
			call price_promo_opt.pc_create_date_partitions('price_markdown_opt', 'tb_store_split_mkd', 'week', '2 week', 'backward');


	        INSERT INTO price_markdown_opt.tb_store_split_mkd
	        (
		    product_id,
		    store_id,
		    s0_id,
		    s1_id,
		    week_start_date,
		    store_ratio
	        )

		  select
		    product_id,
		    store_id,
		    s0_id,
		    s1_id,
		    week_start_date,
		    store_split_ratio
		  from public.store_split_mkd
		  group by 1,2,3,4,5,6
		;
		CREATE INDEX idx_prd_cid_weekstartdate_mkd ON
		price_markdown_opt.tb_store_split_mkd
		USING BTREE (product_id, week_start_date);
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