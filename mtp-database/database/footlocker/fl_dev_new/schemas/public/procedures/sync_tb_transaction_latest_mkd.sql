--liquibase formatted sql
--changeset sreevathsa.sp:sync_tb_transaction_latest_mkd_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_transaction_latest_mkd
--comment: sync tb_transaction_latest_mkd from tb_transaction_promo_mkd_combined
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_transaction_latest_mkd();

CREATE OR REPLACE PROCEDURE public.sync_tb_transaction_latest_mkd()
 LANGUAGE plpgsql
AS $procedure$

declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_transaction_latest_mkd';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_worker text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

		-- Create partitions for 70 weeks backward
		raise notice 'step_01_start:%',(clock_timestamp() - _st);
		SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_markdown_opt'', ''tb_transaction_latest_mkd'', ''day'', ''70 week'', ''backward'');');
	    PERFORM public.async_query_status(_worker, 'cleanup');

		raise notice 'step_01_end:%',(clock_timestamp() - _st);

		_log_step := 'parallel_upsert';
		raise notice 'step_02_start:%',(clock_timestamp() - _st);
		perform public.parellel_insert(
			'WITH rows AS (
				INSERT INTO price_markdown_opt.tb_transaction_latest_mkd (
					date_id,
					product_id,
					store_id,
					clearance_indicator,
					cost,
					retail_price,
					aur,
					aum,
					selling_price,
					selling_price_with_vat,
					final_discount_percent,
					total_inv,
					sync_date_time,
					currency_id,
					retail_price_with_vat,
					revenue_with_vat,
					margin_with_vat,
					aur_with_vat,
					aum_with_vat,
					final_price_with_vat,
					currency,
					no_of_txn,
					gross_quantity,
					gross_revenue,
					gross_revenue_with_vat,
					gross_margin,
					gross_margin_with_vat,
					gross_sp_with_vat,
					gross_sp,
					gross_dis_amount_with_vat,
					gross_dis_amount,
					gross_dis_perc_with_vat,
					gross_dis_perc,
					final_discount_percent_with_vat,
					final_amount,
					final_amount_with_vat,
					promo_spend,
					promo_discount,
					promo_amount,
					promo_amount_with_vat,
					promo_discount_with_vat,
					coupon_amount,
					coupon_amount_with_vat,
					coupon_discount,
					coupon_discount_with_vat,
					version_code,
					dis_amount,
					dis_perc,
					store_reco_level
				)
				SELECT
					date_id,
					product_id,
					store_id,
					mkd_clearance_indicator,
					mkd_cost,
					mkd_retail_price,
					mkd_aur,
					mkd_aum,
					mkd_selling_price,
					mkd_selling_price_with_vat,
					mkd_final_discount_percent,
					mkd_total_inv,
					CURRENT_DATE,
					currency_id,
					mkd_retail_price_with_vat,
					mkd_gross_revenue_with_vat,
					mkd_gross_margin_with_vat,
					mkd_aur,
					mkd_aum,
					mkd_final_amount_with_vat,
					currency,
					mkd_no_of_txn,
					mkd_gross_quantity,
					mkd_gross_revenue,
					mkd_gross_revenue_with_vat,
					mkd_gross_margin,
					mkd_gross_margin_with_vat,
					mkd_selling_price_with_vat,
					mkd_selling_price,
					mkd_dis_amount,
					mkd_dis_amount,
					mkd_dis_perc,
					mkd_dis_perc,
					mkd_final_discount_percent,
					mkd_final_amount,
					mkd_final_amount_with_vat,
					mkd_promo_spend,
					mkd_promo_discount,
					mkd_promo_spend,
					mkd_promo_spend,
					mkd_promo_discount,
					mkd_coupon_amount,
					mkd_coupon_amount,
					mkd_coupon_discount,
					mkd_coupon_discount,
					1 as version_code,
					mkd_dis_amount,
					mkd_dis_perc,
					store_reco_level
				FROM public.tb_transaction_promo_mkd_combined t1
				{where}
				ON CONFLICT (date_id, product_id, store_id, clearance_indicator)
				DO UPDATE SET
					cost = EXCLUDED.cost,
					retail_price = EXCLUDED.retail_price,
					aur = EXCLUDED.aur,
					aum = EXCLUDED.aum,
					selling_price = EXCLUDED.selling_price,
					selling_price_with_vat = EXCLUDED.selling_price_with_vat,
					final_discount_percent = EXCLUDED.final_discount_percent,
					total_inv = EXCLUDED.total_inv,
					sync_date_time = EXCLUDED.sync_date_time,
					currency_id = EXCLUDED.currency_id,
					retail_price_with_vat = EXCLUDED.retail_price_with_vat,
					revenue_with_vat = EXCLUDED.revenue_with_vat,
					margin_with_vat = EXCLUDED.margin_with_vat,
					aur_with_vat = EXCLUDED.aur_with_vat,
					aum_with_vat = EXCLUDED.aum_with_vat,
					final_price_with_vat = EXCLUDED.final_price_with_vat,
					currency = EXCLUDED.currency,
					no_of_txn = EXCLUDED.no_of_txn,
					gross_quantity = EXCLUDED.gross_quantity,
					gross_revenue = EXCLUDED.gross_revenue,
					gross_revenue_with_vat = EXCLUDED.gross_revenue_with_vat,
					gross_margin = EXCLUDED.gross_margin,
					gross_margin_with_vat = EXCLUDED.gross_margin_with_vat,
					gross_sp_with_vat = EXCLUDED.gross_sp_with_vat,
					gross_sp = EXCLUDED.gross_sp,
					gross_dis_amount_with_vat = EXCLUDED.gross_dis_amount_with_vat,
					gross_dis_amount = EXCLUDED.gross_dis_amount,
					gross_dis_perc_with_vat = EXCLUDED.gross_dis_perc_with_vat,
					gross_dis_perc = EXCLUDED.gross_dis_perc,
					final_discount_percent_with_vat = EXCLUDED.final_discount_percent_with_vat,
					final_amount = EXCLUDED.final_amount,
					final_amount_with_vat = EXCLUDED.final_amount_with_vat,
					promo_spend = EXCLUDED.promo_spend,
					promo_discount = EXCLUDED.promo_discount,
					promo_amount = EXCLUDED.promo_amount,
					promo_amount_with_vat = EXCLUDED.promo_amount_with_vat,
					promo_discount_with_vat = EXCLUDED.promo_discount_with_vat,
					coupon_amount = EXCLUDED.coupon_amount,
					coupon_amount_with_vat = EXCLUDED.coupon_amount_with_vat,
					coupon_discount = EXCLUDED.coupon_discount,
					coupon_discount_with_vat = EXCLUDED.coupon_discount_with_vat,
					dis_amount = EXCLUDED.dis_amount,
					dis_perc = EXCLUDED.dis_perc,
					store_reco_level = EXCLUDED.store_reco_level
				RETURNING 1
			)
			SELECT count(1) as cnt FROM rows;',
			50,
			'public.tb_transaction_promo_mkd_combined',
			'product_id',
			'tpmc_mkd_product_id_idx',
			30
		);
		raise notice 'step_02_end:%',(clock_timestamp() - _st);
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