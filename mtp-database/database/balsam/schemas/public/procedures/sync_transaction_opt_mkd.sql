-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_transaction_opt_mkd_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_transaction_opt_mkd
-- comment: derived table for transaction_opt_mkd_v5

DROP  PROCEDURE if exists public.sync_transaction_opt_mkd();

CREATE OR REPLACE PROCEDURE public.sync_transaction_opt_mkd()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_transaction_opt_mkd';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        delete from
	          price_markdown_opt.tb_transaction_latest_mkd
	        where
	          true;
			call price_promo_opt.pc_create_date_partitions('price_markdown_opt', 'tb_transaction_latest_mkd', 'day', '2 week', 'backward');
	        INSERT INTO price_markdown_opt.tb_transaction_latest_mkd
	        (
			date_id,
			s0_id,
			s1_id,
			country,
			channel,
			style_cuq,
			product_id,
			store_id,
			clearance_indicator,
			"cost",
			base_price,
			retail_price,
			quantity,
			revenue,
			margin,
			aur,
			aum,
			final_price,
			final_discount_percent,
			promo_discount,
			total_inv,
			sync_date_time
	        )
			select
          cast("date" as date),
			s0_id,
			s1_id,
			country,
			channel,
			style_cuq,
			product_id,
			store_id,
			clearance_indicator,
			"cost",
			base_price,
			retail_price,
			quantity,
			revenue,
			margin,
			aur,
			aum,
			final_price,
			final_discount_percent,
			promo_discount,
			total_inv,
    	  current_date as sync_date_time
			from public.transaction_opt_mkd
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