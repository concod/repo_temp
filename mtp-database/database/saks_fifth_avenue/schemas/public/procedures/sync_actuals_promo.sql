-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_actuals_promo_v7 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_actuals_promo
-- comment: derived table for actuals_promo_v5

DROP  PROCEDURE if exists public.sync_actuals_promo();

CREATE OR REPLACE PROCEDURE public.sync_actuals_promo()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_actuals_promo';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _date_id DATE;  -- Variable to hold each date_id in the loop
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Loop through each distinct date_id based on the specified criteria
    FOR _date_id IN
        SELECT DISTINCT date_id
        FROM price_promo.promo_txn
        WHERE date_id >= current_date - 9
    LOOP
        -- Call the function for each date_id
        BEGIN
            EXECUTE FORMAT('
                SELECT * FROM price_promo_opt.fn_update_actual_tables(%L);', _date_id);
            RAISE NOTICE 'Completed processing for date_id %L', _date_id;
        END;
    END LOOP;

    -- Optionally raise a notice after processing all date_ids
    RAISE NOTICE 'Completed processing for all date_ids.';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;
