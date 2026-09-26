-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_tb_transaction_latest_mkd runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_transaction_latest_mkd
-- comment: derived table for tb_transaction_latest_mkd

DROP PROCEDURE IF EXISTS public.sync_tb_transaction_latest_mkd;

create or replace procedure public.sync_tb_transaction_latest_mkd()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_transaction_latest_mkd';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
    TRUNCATE TABLE price_markdown_opt.tb_transaction_latest_mkd;
	call price_markdown_opt.pc_create_date_partitions('price_markdown_opt', 'tb_transaction_latest_mkd', 'day', '3 year', 'backward');
    call price_markdown_opt.pc_create_date_partitions('price_markdown_opt', 'tb_transaction_latest_mkd', 'day', '4 week', 'backward');
    
	insert into price_markdown_opt.tb_transaction_latest_mkd
	(product_id, date_id, store_id, currency, currency_id, no_of_txn, cost, base_price_with_vat, 
	base_price, base_price_secondary, retail_price_with_vat, retail_price, gross_quantity, 
	gross_revenue, gross_revenue_with_vat, gross_margin, gross_margin_with_vat, gross_sp_with_vat, 
	gross_sp, gross_dis_amount_with_vat, gross_dis_amount, gross_dis_perc, gross_dis_perc_with_vat, 
	final_discount_percent_with_vat, final_discount_percent, final_amount, final_amount_with_vat, 
	promo_amount, promo_amount_with_vat, promo_discount, promo_discount_with_vat, coupon_amount_with_vat, 
	coupon_amount, coupon_discount, coupon_discount_with_vat, aur, aur_with_vat, aum, aum_with_vat, total_inv, 
	vat_rate_per, clearance_indicator

)
	select 
	product_id, date_id, store_id, currency, currency_id, no_of_txn, cost, base_price_with_vat, 
	base_price, base_price_secondary, retail_price_with_vat, retail_price, gross_quantity, 
	gross_revenue, gross_revenue_with_vat, gross_margin, gross_margin_with_vat, gross_sp_with_vat, 
	gross_sp, gross_dis_amount_with_vat, gross_dis_amount, gross_dis_perc, gross_dis_perc_with_vat, 
	final_discount_percent_with_vat, final_discount_percent, final_amount, final_amount_with_vat, 
	promo_amount, promo_amount_with_vat, promo_discount, promo_discount_with_vat, coupon_amount_with_vat, 
	coupon_amount, coupon_discount, coupon_discount_with_vat, aur, aur_with_vat, aum, aum_with_vat, total_inv, 
	vat_rate_per, clearance_indicator
	from public.tb_transaction_latest_mkd;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;
