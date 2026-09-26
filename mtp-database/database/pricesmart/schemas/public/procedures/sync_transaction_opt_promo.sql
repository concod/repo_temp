-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_transaction_opt_promo_v11 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_transaction_opt_promo
-- comment: derived table for transaction_opt_promo_v11

DROP  PROCEDURE if exists public.sync_transaction_opt_promo();

CREATE OR REPLACE PROCEDURE public.sync_transaction_opt_promo()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_transaction_opt_promo';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _min_date DATE;
    _max_date DATE;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Get the minimum and maximum dates from transaction_opt_promo
    SELECT MIN(date), MAX(date)
    INTO _min_date, _max_date
    FROM public.transaction_opt_promo;

    -- Delete rows from promo_txn based on date range
    EXECUTE FORMAT(
        'DELETE FROM price_promo.promo_txn
        WHERE date_id >= %L AND date_id <= %L;',
        _min_date, _max_date
    );

--          call price_promo_opt.pc_create_date_partitions('price_promo', 'promo_txn', 'day', '3 year', 'backward');
          call price_promo_opt.pc_create_date_partitions('price_promo', 'promo_txn', 'day', '4 week', 'backward');
	        INSERT INTO price_promo.promo_txn
	        (
			date_id,
			s0_id,
			s1_id,
			country,
			channel,
			l5_id,
			product_id,
			clearance_indicator,
			no_of_txn,
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
			sync_date_time,
			app_gross_quantity,
			app_gross_revenue,
			app_gross_margin,
			loy_gross_quantity,
			loy_gross_revenue,
			loy_gross_margin
	        )

		  select
          cast("date" as date),
          s0_id,
          s1_id,
          country,
          channel,
          cast(l5_id as int8) as l5_id,
          product_id,
          clearance_indicator,
          no_of_txn,
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
    	  current_date as sync_date_time,
          app_gross_quantity,
		  app_gross_revenue,
		  app_gross_margin,
	      loy_gross_quantity,
		  loy_gross_revenue,
		  loy_gross_margin
		  from public.transaction_opt_promo
		  group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32
		;
--	call price_promo_opt.pc_create_date_partitions('price_promo', 'promo_txn', 'day', '1 week');

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