-- liquibase formatted sql
-- changeset vedanand.dandu@impactanalytics.co:sync_all_one_time_table_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_all_one_time_table_promo
-- comment: initial changeset for sync_all_one_time_table_promo
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_all_one_time_table_promo();


CREATE OR REPLACE PROCEDURE public.sync_all_one_time_table_promo()
LANGUAGE plpgsql
AS $$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_all_one_time_table_promo';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	-- INSERT INTO global.tb_inventory_master (
	--     product_id, clearance_indicator, date, oh, it, oo, vendor_oo, total_inventory, 
	--     clearance_indicator_rf, lifecycle, age, ST, clearance_eligible, store_id, ps_reco_level
	-- )
	-- VALUES (
	--     227515, 0, '2025-06-30', 0, 0, 0, 0, 0,
	--     '0', 0, 0, 0, 0, 0, '0'
	-- );


    DELETE FROM global.tb_currency_master;
    DELETE FROM global.tb_country_master;
    DELETE FROM global.tb_currency_priority;
    DELETE FROM global.planned_forex_rate;
    DELETE FROM global.actual_forex_rate;
    DELETE FROM global.tb_country_currency_mapping;
    -- DELETE FROM "global".customer_master;
    -- DELETE FROM "global".customer_channel_master;
    -- DELETE FROM price_promo.tb_product_store_price;

    INSERT INTO global.tb_currency_master VALUES (1, 'USD', '$');

    INSERT INTO global.tb_country_master VALUES (1, 'US', 'US');

    INSERT INTO global.tb_currency_priority VALUES (1, 1, 1);

    INSERT INTO global.tb_country_currency_mapping VALUES (1, 1, 1);

    INSERT INTO global.planned_forex_rate (date, source_currency_id, target_currency_id, planned_conversion_multiplier)
	SELECT 
	    date_id AS date,
	    1 AS source_currency_id,
	    1 AS target_currency_id,
	    1.0 AS planned_conversion_multiplier
	FROM global.tb_fiscal_date_mapping
	WHERE date_id BETWEEN '2024-01-01' AND '2035-12-31';

    INSERT INTO global.actual_forex_rate (date, source_currency_id, target_currency_id, planned_conversion_multiplier)
	SELECT 
	    date_id AS date,
	    1 AS source_currency_id,
	    1 AS target_currency_id,
	    1.0 AS planned_conversion_multiplier
	FROM global.tb_fiscal_date_mapping
	WHERE date_id BETWEEN '2024-01-01' AND '2035-12-31';

	--
	-- INSERT INTO "global".customer_master (
    -- c0_name, c0_id,
    -- c1_name, c1_id,
    -- c2_name, c2_id,
    -- customer_id, customer_name
	-- )
	-- VALUES (
	--     'all', 1,
	--     'all', 1,
	--     'all', 1,
	--     1, 'all'
	-- );

	
	-- Insert one row
	-- INSERT INTO "global".customer_channel_master (
	--     c0_name, c0_id,
	--     s0_name, s0_id
	-- ) VALUES (
	--     'all', 1,
	--     'all', 1
	-- );

-----------
	
	  -- Step 2: Insert dummy data
-- 	  INSERT INTO price_promo.tb_product_store_price (
-- 	    product_id, store_id, customer_id, clearance_indicator, promo_base_price, cost,
-- 	    previous_promo_base_price, last_reg_price, effective_from_date, effective_till_date,
-- 	    currency_id, updated_at, promo_base_price_valid_from, promo_base_price_valid_to
-- 	  )
-- 	  VALUES (
-- 	783388,                   -- product_id
-- 	7731,                     -- store_id
-- 	NULL,                     -- customer_id
-- 	'REGULAR PRICE',          -- clearance_indicator
-- 	0,                        -- promo_base_price
-- 	0,                        -- cost
-- 	NULL,                     -- previous_promo_base_price
-- 	NULL,                     -- last_reg_price
-- 	TO_DATE('29-08-2024', 'DD-MM-YYYY'),                             -- effective_from_date
-- 	TO_TIMESTAMP('30-08-2024 05:01', 'DD-MM-YYYY HH24:MI'),          -- effective_till_date
-- 	NULL,                     -- currency_id
-- 	NULL,                      -- updated_at
--   '2025-08-01', '2026-08-01'
-- 	  );
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;