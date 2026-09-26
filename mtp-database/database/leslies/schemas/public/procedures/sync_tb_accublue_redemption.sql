-- liquibase formatted sql
-- changeset vaibhav.singh@impactanalytics.co:sync_tb_accublue_redemption runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_accublue_redemption
-- comment: derived table for sync_tb_accublue_redemption

DROP PROCEDURE if exists public.sync_tb_accublue_redemption();

CREATE OR REPLACE PROCEDURE public.sync_tb_accublue_redemption()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_accublue_redemption';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo.tb_accublue_redemption;

	        INSERT INTO price_promo.tb_accublue_redemption
	        (
                fiscal_year,
                phase,
                s3_id,
                l0_cid,
                ab_txn_count,
                all_txn_count,
                txn_redemption,
                ab_cust_count,
                all_cust_count,
                cust_redemption


	        )
			select
                fiscal_year,
                phase,
                s3_id,
                l0_cid,
                ab_txn_count,
                all_txn_count,
                txn_redemption,
                ab_cust_count,
                all_cust_count,
                cust_redemption
			from public.tb_accublue_redemption;
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
