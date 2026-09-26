-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_loyalty_app_factor_opt_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_loyalty_app_factor_opt
-- comment: derived table for tb_loyalty_app_factor_opt_v5

DROP  PROCEDURE if exists public.sync_loyalty_app_factor_opt();

CREATE OR REPLACE PROCEDURE public.sync_loyalty_app_factor_opt()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_loyalty_app_factor_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			TRUNCATE TABLE price_promo_opt.tb_loyalty_app_factor_opt;

	        INSERT INTO price_promo_opt.tb_loyalty_app_factor_opt
	        (
		    s1_id,
		    loyalty_factor,
		    app_only_factor
	        )

		  select
		    cast(s1_id as INTEGER) as s1_id,
		    round(cast(loyalty_factor as numeric),2) as loyalty_factor,
		    round(cast(app_only_factor as numeric),2) as app_only_factor
		  from public.loyalty_app_factor_opt
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