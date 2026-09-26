--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_event_basket_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_add_event_basket_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_event_basket_data ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_event_basket_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    duration interval;
    step_start_time timestamp;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE '=== STARTING pc_add_event_basket_data for date: % ===', var_date;

    -- Step 1: Create temp table with distinct event-product-store combinations
    RAISE NOTICE 'Step 1: Creating UNLOGGED temp table with distinct event-product-store combinations';
    step_start_time := clock_timestamp();
    
    DROP TABLE IF EXISTS price_promo_opt_temp.tb_event_combinations;

    CREATE UNLOGGED TABLE price_promo_opt_temp.tb_event_combinations AS
    SELECT 
        ft.event_id,
        ft.product_id,
        ft.store_id,
        ft.customer_id
    FROM price_promo.promo_txn AS txn
    INNER JOIN price_promo_opt_temp.current_finalized_promo_products_temp AS ft
	on ft.product_id = txn.product_id
	and ft.store_id = txn.store_id
	and ft.customer_id = txn.c2_id
	where txn.date_id = var_date	
	
    group by 1,2,3,4;

    -- Create indexes on the temp table for performance
    CREATE INDEX idx_event_combinations_composite ON price_promo_opt_temp.tb_event_combinations (product_id, store_id, customer_id);
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 1 COMPLETED: Create temp table took: %', duration;

    -- Step 2: Delete existing data from tb_event_date_basketdetails for this date
    RAISE NOTICE 'Step 2: Deleting existing data from tb_event_date_basketdetails for date: %', var_date;
    step_start_time := clock_timestamp();
    
    DELETE FROM price_promo.tb_event_date_basketdetails
    WHERE date = var_date;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 2 COMPLETED: Delete existing data took: %', duration;

    -- Step 3: Insert into tb_event_date_basketdetails with event-date aggregation
    RAISE NOTICE 'Step 3: Inserting event-date data into tb_event_date_basketdetails';
    step_start_time := clock_timestamp();
    
    INSERT INTO price_promo.tb_event_date_basketdetails (
        event_id, 
        date,
        event_offer_txn,
        event_offer_units_per_txn, 
        event_offer_avg_basket_size, 
        event_offer_avg_margin,
        event_offer_units, 
        event_offer_revenue, 
        event_offer_margin
    )
    SELECT
        ec.event_id,
        var_date as date,
        COUNT(DISTINCT txn_basket.transaction_id)::float8 AS event_offer_txn,
        ROUND(COALESCE(SUM(txn_basket.gross_quantity)::float / NULLIF(COUNT(DISTINCT txn_basket.transaction_id), 0), 0)::numeric, 2)::float8 AS event_offer_units_per_txn,
        ROUND(COALESCE(SUM(txn_basket.gross_revenue)::float / NULLIF(COUNT(DISTINCT txn_basket.transaction_id), 0), 0)::numeric, 2)::float8 AS event_offer_avg_basket_size,
        ROUND(COALESCE(SUM(txn_basket.gross_margin)::float / NULLIF(COUNT(DISTINCT txn_basket.transaction_id), 0), 0)::numeric, 2)::float8 AS event_offer_avg_margin,
        SUM(COALESCE(txn_basket.gross_quantity, 0))::float8 AS event_offer_units,
        SUM(COALESCE(txn_basket.gross_revenue, 0))::float8 AS event_offer_revenue,
        SUM(COALESCE(txn_basket.gross_margin, 0))::float8 AS event_offer_margin
    FROM price_promo_opt_temp.tb_event_combinations ec
    INNER JOIN price_promo.promo_txn_basket AS txn_basket
        ON txn_basket.product_id = ec.product_id
        AND txn_basket.store_id = ec.store_id
        AND txn_basket.c2_id = ec.customer_id
    WHERE txn_basket.date_id = var_date
    GROUP BY ec.event_id;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 3 COMPLETED: Insert into tb_event_date_basketdetails took: %', duration;

    -- Step 4: Insert into main tb_event_basketdetails for events ending on var_date
    RAISE NOTICE 'Step 4: Aggregating and inserting into main tb_event_basketdetails for events ending on: %', var_date;
    step_start_time := clock_timestamp();
    
    -- First delete existing data for events ending on var_date
    DELETE FROM price_promo.tb_event_basketdetails
    WHERE event_id IN (
        SELECT  em.event_id
        FROM price_promo.event_master em
        WHERE em.end_date = var_date
    );
    
    -- Then insert aggregated data
    INSERT INTO price_promo.tb_event_basketdetails (
        event_id, 
        event_offer_txn,
        event_offer_units_per_txn, 
        event_offer_avg_basket_size, 
        event_offer_avg_margin,
        event_offer_units, 
        event_offer_revenue, 
        event_offer_margin
    )
    SELECT 
        edb.event_id,
        SUM(event_offer_txn) AS event_offer_txn,
        ROUND(COALESCE(SUM(event_offer_units) / NULLIF(SUM(event_offer_txn), 0), 0)::numeric, 2)::float8 AS event_offer_units_per_txn,
        ROUND(COALESCE(SUM(event_offer_revenue) / NULLIF(SUM(event_offer_txn), 0), 0)::numeric, 2)::float8 AS event_offer_avg_basket_size,
        ROUND(COALESCE(SUM(event_offer_margin) / NULLIF(SUM(event_offer_txn), 0), 0)::numeric, 2)::float8 AS event_offer_avg_margin,
        SUM(event_offer_units) AS event_offer_units,
        SUM(event_offer_revenue) AS event_offer_revenue,
        SUM(event_offer_margin) AS event_offer_margin
    FROM price_promo.tb_event_date_basketdetails edb
    INNER JOIN price_promo.event_master em ON em.event_id = edb.event_id
    WHERE em.end_date = var_date
    GROUP BY edb.event_id;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 4 COMPLETED: Insert into main tb_event_basketdetails took: %', duration;
    
    -- Calculate overall duration
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE '=== pc_add_event_basket_data COMPLETED in: % ===', duration;

END;
$procedure$
;
