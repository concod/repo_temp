-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_offer_attractiveness_factor_opt_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_offer_attractiveness_factor_opt
-- comment: derived table for tb_offer_attractiveness_factor_opt_v5

DROP  PROCEDURE if exists public.sync_offer_attractiveness_factor_opt();

CREATE OR REPLACE PROCEDURE public.sync_offer_attractiveness_factor_opt()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_offer_attractiveness_factor_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			TRUNCATE TABLE price_promo_opt.tb_offer_attractiveness_factor_opt;

	        INSERT INTO price_promo_opt.tb_offer_attractiveness_factor_opt
	        (
		    l2_cid,
		    min_discount_range,
		    max_discount_range,
		    brand_category,
		    min_msrp_range,
		    max_msrp_range,
		    factor,
		    min_product_concentration
	        )

		  select
		    cast(l2_cid as INTEGER) as l2_cid,
		    cast(min_discount_range as INTEGER) as min_discount_range,
		    cast(max_discount_range as INTEGER) as max_discount_range,
		    cast(brand_category as VARCHAR(100)) as brand_category,
		    cast(min_msrp_range as INTEGER) as min_msrp_range,
		    cast(max_msrp_range as INTEGER) as max_msrp_range,
		    round(cast(factor as numeric),2) as factor,
		    cast(min_product_concentration as INTEGER) as min_product_concentration
		  from public.attractiveness_factor_opt
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