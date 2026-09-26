-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_offer_type_penetration_opt_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_offer_type_penetration_opt
-- comment: derived table for tb_offer_type_penetration_opt_v5

DROP  PROCEDURE if exists public.sync_offer_type_penetration_opt();

CREATE OR REPLACE PROCEDURE public.sync_offer_type_penetration_opt()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_offer_type_penetration_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			TRUNCATE TABLE price_promo_opt.tb_offer_type_penetration_opt;

	        INSERT INTO price_promo_opt.tb_offer_type_penetration_opt
	        (
		    s1_id,
		    channel,
		    offer_type,
		    tiered_offer_indicator,
		    offer_x_type,
		    offer_y_type,
		    offer_z_type,
		    offer_type_pen_factor
	        )

		  select
		    cast(s1_id as INTEGER) as s1_id,
		    cast(channel as VARCHAR(100)) as channel,
		    cast(offer_type as VARCHAR(100)) as offer_type,
		    cast(tiered_offer_indicator as INTEGER) as tiered_offer_indicator,
		    cast(offer_x_type as VARCHAR(100)) as offer_x_type,
		    cast(offer_y_type as VARCHAR(100)) as offer_y_type,
		    cast(offer_z_type as VARCHAR(100)) as offer_z_type,
		    round(cast(offer_type_pen_factor as numeric),2) as offer_type_pen_factor
		  from public.offer_type_penetration_opt
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
