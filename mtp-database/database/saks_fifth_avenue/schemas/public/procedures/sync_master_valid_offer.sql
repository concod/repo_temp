-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_master_valid_offer_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_master_valid_offer
-- comment: derived table for master_valid_offers_v5

DROP  PROCEDURE if exists public.sync_master_valid_offer();

CREATE OR REPLACE PROCEDURE public.sync_master_valid_offer()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_master_valid_offer';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			TRUNCATE TABLE price_promo.master_valid_offers;

	        INSERT INTO price_promo.master_valid_offers
	        (
			offer_type,
			offer_x_value,
			offer_x_type,
			offer_y_value,
			offer_y_type,
			offer_z_value,
			offer_z_type,
			offer_identifier,
			discount_filter
	        )

		  select
			offer_type,
			round(cast(offer_x_value as numeric),2) as offer_x_value,
			offer_x_type varchar,
			round(cast(offer_y_value as numeric),2) as offer_y_value,
			offer_y_type varchar,
			round(cast(offer_z_value as numeric),2) as offer_z_value,
			offer_z_type,
			offer_identifier,
			round(cast(discount_filter as numeric),2) as discount_filter
		  from public.master_valid_offer
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