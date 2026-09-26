-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_store_eligible_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_product_attributes
-- comment: derived table for sync_bp_store_eligible_v1

DROP  PROCEDURE if exists public.sync_bp_store_eligible();

CREATE OR REPLACE PROCEDURE public.sync_bp_store_eligible()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_store_eligible';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
            DELETE FROM base_pricing.bp_ineligible_stores t
            USING public.bp_store_eligible s
            WHERE t.store_id = cast(s.store_code as int4)
            AND t.updated_at::date = CURRENT_DATE;
           
            INSERT INTO base_pricing.bp_ineligible_stores
            (
            store_id
            )
 
            select
            cast(store_code as int4)
            from public.bp_store_eligible
            group by 1;
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
