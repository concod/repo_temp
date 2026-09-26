-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_placeholder_pricing_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_placeholder_pricing
-- comment: derived table for placeholder_pricing_v5

DROP  PROCEDURE if exists public.sync_placeholder_pricing();

CREATE OR REPLACE PROCEDURE public.sync_placeholder_pricing()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_placeholder_pricing';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo.tb_placeholder_pricing;

	        INSERT INTO price_promo.tb_placeholder_pricing
	        (
              year,
              month,
              weighted_base_price,
              weighted_cost_price
	        )
			select
              cast(fiscal_year as int4) as year,
              cast(fiscal_month as int4) as month,
              cast(weighted_base_price as float8) as weighted_base_price,
              cast(weighted_cost_price as float8) as weighted_cost_price
			from public.placeholder_pricing
		;
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