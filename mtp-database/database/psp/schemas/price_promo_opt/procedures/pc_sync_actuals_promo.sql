--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:pc_sync_actuals_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for pc_sync_actuals_promo

DROP PROCEDURE if exists price_promo_opt.pc_sync_actuals_promo;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_sync_actuals_promo(IN input_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _date_id DATE;  -- Variable to hold each date_id in the loop
BEGIN
    -- Loop through each distinct date_id based on the specified criteria
    FOR _date_id IN
        SELECT DISTINCT date_id
        FROM price_promo_opt.promo_txn
        WHERE date_id between input_date - 5 and input_date
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
END;
$procedure$
;