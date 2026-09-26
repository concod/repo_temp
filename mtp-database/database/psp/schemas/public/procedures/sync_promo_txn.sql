-- liquibase formatted sql
-- changeset sriraj.varanasi@impactanalytics.co:sync_promo_txn runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_promo_txn
-- comment: initial changeset for sync_promo_txn
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_promo_txn();
CREATE OR REPLACE PROCEDURE public.sync_promo_txn()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_promo_txn';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		-- call public.pc_create_date_partitions('price_promo_opt', 'promo_txn', 'day', '2 year', 'backward');
          	call public.pc_create_date_partitions('price_promo_opt', 'promo_txn', 'day', '150 week', 'backward');
--			TRUNCATE TABLE  price_promo.promo_txn;
          	DELETE FROM price_promo_opt.promo_txn
			WHERE date_id BETWEEN (		   
				SELECT MIN(date_id)
				FROM price_promo_opt.promo_txn_version t1
				WHERE t1.version_code = global.get_table_version('price_promo_opt.promo_txn_version'::text)
				) 
			AND (
				SELECT MAX(date_id)
				FROM price_promo_opt.promo_txn_version t1
				WHERE t1.version_code = global.get_table_version('price_promo_opt.promo_txn_version'::text)
				);
   
	        INSERT INTO price_promo_opt.promo_txn
	        (
               product_id,
               date_id,
               store_id,
               currency,
               currency_id,
               no_of_txn,
               cost,
               promo_base_price,
               quantity,
               revenue,
               margin,
               selling_price,
               promo_spend,
               promo_discount,
               price_spend,
               price_discount,
               coupon_spend,
               coupon_discount,
               aur,
               aum,
               clearance_indicator,
               store_reco_level
	        )
			select
               product_id,
               date_id,
               store_id,
               currency,
               currency_id,
               no_of_txn,
               cost,
               promo_base_price,
               quantity,
               revenue,
               margin,
               selling_price,
               promo_spend,
               promo_discount,
               price_spend,
               price_discount,
               coupon_spend,
               coupon_discount,
               aur,
               aum,
               clearance_indicator,
               store_reco_level
			FROM price_promo_opt.promo_txn_version t1
			WHERE t1.version_code = global.get_table_version('price_promo_opt.promo_txn_version'::text)
			;
			TRUNCATE TABLE price_promo_opt.promo_txn_version;
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
