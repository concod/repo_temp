-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_day_split_opt runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_day_split_opt
-- comment: derived table for tb_day_split_opt

DROP  PROCEDURE if exists public.sync_day_split_opt();

CREATE OR REPLACE PROCEDURE public.sync_day_split_opt()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_day_split_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		    drop table if exists price_promo_opt.tb_day_split_opt CASCADE;
			CREATE TABLE price_promo_opt.tb_day_split_opt (
			    l3_cid INTEGER NOT NULL,
			    date DATE NOT NULL,
			    week_start_date DATE NOT NULL,
			    day_split_ratio FLOAT
			) PARTITION BY RANGE (date);
			call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_day_split_opt', 'day', '56 week', 'forward');
			call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_day_split_opt', 'day', '3 week', 'backward');


	        INSERT INTO price_promo_opt.tb_day_split_opt
	        (
		    l3_cid,
		    date,
		    week_start_date,
		    day_split_ratio
	        )

		  select
		    l3_cid,
		    "date",
		    week_start_date,
		    day_split_ratio
		  from public.day_split_opt
		;
		CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_opt ON
		price_promo_opt.tb_day_split_opt
		USING BTREE (l3_cid, week_start_date);
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
