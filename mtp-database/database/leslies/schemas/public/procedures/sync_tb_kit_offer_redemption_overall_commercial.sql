-- liquibase formatted sql
-- changeset vaibhav.singh@impactanalytics.co:sync_tb_kit_offer_redemption_overall_commercial runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_product_master_promo
-- comment: derived table for sync_tb_kit_offer_redemption_overall_commercial

DROP  PROCEDURE if exists public.sync_tb_kit_offer_redemption_overall_commercial();

CREATE OR REPLACE PROCEDURE public.sync_tb_kit_offer_redemption_overall_commercial()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_kit_offer_redemption_overall_commercial';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo.tb_kit_offer_redemption_overall_commercial;

	        INSERT INTO price_promo.tb_kit_offer_redemption_overall_commercial
	        (
                c0_name,
                c0_id,
                slot1,
                slot2,
                phase,
                slot1_txn,
                slot2_txn,
                intersecting_txn,
                joint_redemption,
                sum_product
          )
			select
                c0_name,
                c0_id,
                slot1,
                slot2,
                phase,
                slot1_txn,
                slot2_txn,
                intersecting_txn,
                joint_redemption,
                sum_product
			from public.tb_kit_offer_redemption_overall_commercial;
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
