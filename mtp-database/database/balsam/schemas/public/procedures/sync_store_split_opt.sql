-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_store_split_opt_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_store_split_opt
-- comment: derived table for tb_store_split_opt_v5

DROP  PROCEDURE if exists public.sync_store_split_opt();

CREATE OR REPLACE PROCEDURE public.sync_store_split_opt()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_split_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		    drop table if exists price_promo_opt.tb_store_split_opt CASCADE;
			CREATE TABLE price_promo_opt.tb_store_split_opt (
			    l3_cid INTEGER NOT NULL,
			    brand_cid INTEGER NOT NULL,
			    store_id INTEGER NOT NULL,
			    s0_id INTEGER NOT NULL,
			    s1_id INTEGER NOT NULL,
			    week_start_date DATE NOT NULL,
			    store_split_ratio FLOAT
			) PARTITION BY RANGE (week_start_date);
			call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_store_split_opt', 'week', '28 week', 'forward');
			call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_store_split_opt', 'week', '2 week', 'backward');


	        INSERT INTO price_promo_opt.tb_store_split_opt
	        (
		    l3_cid,
		    brand_cid,
		    store_id,
		    s0_id,
		    s1_id,
		    week_start_date,
		    store_split_ratio
	        )

		  select
		    l3_cid,
		    brand_cid,
		    store_id,
		    s0_id,
		    s1_id,
		    week_start_date,
		    store_split_ratio
		  from public.store_split_opt
		  group by 1,2,3,4,5,6,7
		;
		CREATE INDEX idx_l3cid_brandcid_weekstartdate_opt ON
		price_promo_opt.tb_store_split_opt
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