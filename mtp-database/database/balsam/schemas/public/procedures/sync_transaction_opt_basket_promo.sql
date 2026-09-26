-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_transaction_opt_basket_promo_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_transaction_opt_basket_promo
-- comment: derived table for transaction_opt_basket_promo_v5

DROP  PROCEDURE if exists public.sync_transaction_opt_basket_promo();

CREATE OR REPLACE PROCEDURE public.sync_transaction_opt_basket_promo()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_transaction_opt_basket_promo';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo.promo_txn_basket;
            call price_promo_opt.pc_create_date_partitions('price_promo', 'promo_txn_basket', 'day', '3 month', 'backward');
	        INSERT INTO price_promo.promo_txn_basket
	        (
			date_id,
			s0_id,
			s1_id,
			country,
			channel,
			transaction_id,
			store_id,
			l5_id,
			product_id,
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
			pre_coupon_price,
			coupon_amount,
			coupon_discount,
			extended_discount,
			sync_date_time
	        )

		  select
          cast("date" as date),
          s0_id,
          s1_id,
          country,
          channel,
          order_id,
          store_code,
          cast(l5_id as int8) as l5_id,
          product_id,
          clearance_indicator,
          gross_cost,
          gross_launch_price,
          gross_retail_price,
          gross_quantity,
          gross_revenue,
          gross_margin,
          aur,
          aum,
          gross_sp,
          gross_dis_perc,
          gross_disc,
          total_inv,
	      cast(NULL as real) as pre_coupon_price,
	      cast(NULL as real) as coupon_amount,
	      cast(NULL as real) as coupon_discount,
	      cast(NULL as real) as extended_discount,
    	  current_date as sync_date_time
		  from public.transaction_opt_basket_promo
		  where order_id is not null
		  group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27
		;
--	call price_promo_opt.pc_create_date_partitions('price_promo', 'promo_txn_basket', 'day', '2 month');

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