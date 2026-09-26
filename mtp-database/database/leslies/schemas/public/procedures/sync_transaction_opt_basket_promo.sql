-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_transaction_opt_basket_promo_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_transaction_opt_basket_promo
-- comment: derived table for sync_transaction_opt_basket_promo_v2

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
		     -- call public.pc_create_date_partitions('price_promo', 'promo_txn_basket', 'day', '3 year', 'backward');
          	 call public.pc_create_date_partitions('price_promo', 'promo_txn_basket', 'day', '20 week', 'backward');

	        INSERT INTO price_promo.promo_txn_basket
	        (
                date_id,
                channel,
                store_id,
                c0_name,
                c0_id,
                c2_name,
                c2_id,
                l5_id, 
                product_id,
                transaction_id,
                clearance_indicator, 
                gross_cost,
                gross_launch_price, 
                gross_retail_price,
                gross_quantity,
                gross_revenue,
                gross_margin,
                contri_margin,
                aur,
                aum,
                gross_disc,
                gross_promo_disc,
                gross_promo_discount_percent,
                gross_coupon_discount_percent,
                gross_dis_perc,
                gross_sp,
                total_inv,
                currency_id
	        )
			select
                date_id,
                channel,
                store_code,
                c0_name,
                c0_id,
                c2_name,
                c2_id,
                l5_id, 
                product_id,
                order_id,
                clearance_indicator, 
                gross_cost,
                gross_launch_price, 
                gross_retail_price,
                gross_quantity,
                gross_revenue,
                gross_margin,
                contri_margin,
                aur,
                aum,
                gross_disc,
                gross_promo_disc,
                gross_promo_discount_percent,
                gross_coupon_discount_percent,
                gross_discount_percent,
                gross_sp,
                total_inv,
                currency_id
			from public.transaction_opt_basket_promo;
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
