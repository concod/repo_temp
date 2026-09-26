-- liquibase formatted sql
-- changeset bhavya.visaria@impactanalytics.co:sync_oms_otb_test runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_status
-- comment: initial changeset for sync_oms_otb


DROP PROCEDURE if exists public.sync_oms_otb(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_otb(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_otb';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
             delete from 
               inventory_smart.oms_otb 
             where 
               true;
    end if;
   
   INSERT INTO inventory_smart.oms_otb
   (
        product_code, 
		loc_code, 
		channel, 
		fiscal_year_week, 
		mfp_units, 
		approved_otb, 
		total_units, 
		otb, 
		recom_receipts,
		fiscal_year_week_receipt
    )
    SELECT
        product_code, 
		loc_code, 
		channel, 
		fiscal_year_week, 
		mfp_units, 
		approved_otb, 
		total_units, 
		otb, 
		recom_receipts,
		fiscal_year_week_receipt

    FROM public.oms_otb
    ON CONFLICT ON CONSTRAINT pk_oms_otb DO NOTHING;

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
