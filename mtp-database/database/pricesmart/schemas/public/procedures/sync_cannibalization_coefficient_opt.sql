-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_cannibalization_coefficient_opt_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_cannibalization_coefficient_opt
-- comment: derived table for tb_cannibalization_coefficient_opt_v5

DROP  PROCEDURE if exists public.sync_cannibalization_coefficient_opt();

CREATE OR REPLACE PROCEDURE public.sync_cannibalization_coefficient_opt()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_cannibalization_coefficient_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			TRUNCATE TABLE price_promo_opt.tb_cannibalization_coefficient_opt;

	        INSERT INTO price_promo_opt.tb_cannibalization_coefficient_opt
	        (
		    coefficient,
		    s1_id,
		    cannibalizer_l3_cid,
		    cannibalizer_brand_cid,
		    cannibalized_l3_cid,
		    cannibalized_brand_cid
	        )

		  select
		    round(cast(coefficient as numeric),2) as coefficient,
		    cast(s1_id as INTEGER) as s1_id,
		    cast(cannibalizer_l3_cid as INTEGER) as cannibalizer_l3_cid,
		    cast(cannibalizer_brand_cid as INTEGER) as cannibalizer_brand_cid,
		    cast(cannibalized_l3_cid as INTEGER) as cannibalized_l3_cid,
		    cast(cannibalized_brand_cid as INTEGER) as cannibalized_brand_cid
		  from public.cannibalization_coefficient_opt
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