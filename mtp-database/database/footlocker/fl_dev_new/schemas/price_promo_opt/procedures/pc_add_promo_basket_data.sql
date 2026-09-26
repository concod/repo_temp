--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_promo_basket_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_promo_basket_data

DROP PROCEDURE if exists price_promo_opt.pc_add_promo_basket_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_promo_basket_data(IN var_date date, IN customer_flag integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    duration interval;
    step_start_time timestamp;
	sql_query text;
	customer_join text;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE '=== STARTING pc_add_promo_basket_data for date: % ===', var_date;
    
    -- Step 1: Drop and create UNLOGGED temp table with promo-date level data
    RAISE NOTICE 'Step 1: Creating UNLOGGED temp table for promo-date level data';
    step_start_time := clock_timestamp();
    
    DROP TABLE IF EXISTS price_promo_opt_temp.tb_promo_date_basketdetails;
    
	IF customer_flag = 1 THEN
        customer_join := 'AND txn.customer_reco_level = ft.customer_reco_level';
    ELSE
        customer_join := '';
    END IF;

    sql_query := format($fmt$
        CREATE UNLOGGED TABLE price_promo_opt_temp.tb_promo_date_basketdetails AS
        SELECT
            ft.promo_id,
            ft.recommendation_date AS date,
            COUNT(DISTINCT txn.transaction_id)::float8 AS promo_offer_txn,
            ROUND(COALESCE(SUM(txn.quantity)::float / NULLIF(COUNT(DISTINCT txn.transaction_id), 0), 0)::numeric, 2)::float8 AS promo_offer_units_per_txn,
            ROUND(COALESCE(SUM(txn.revenue)::float / NULLIF(COUNT(DISTINCT txn.transaction_id), 0), 0)::numeric, 2)::float8 AS promo_offer_avg_basket_size,
            ROUND(COALESCE(SUM(txn.margin)::float / NULLIF(COUNT(DISTINCT txn.transaction_id), 0), 0)::numeric, 2)::float8 AS promo_offer_avg_margin,
            SUM(COALESCE(txn.quantity, 0))::float8 AS promo_offer_units,
            SUM(COALESCE(txn.revenue, 0))::float8 AS promo_offer_revenue,
            SUM(COALESCE(txn.margin, 0))::float8 AS promo_offer_margin
        FROM price_promo_opt.current_finalized_promo_products ft
--        JOIN price_promo_opt.promo_txn_agg txn
		JOIN price_promo_opt.promo_txn_master txn
            ON txn.product_id = ft.product_id
            AND txn.store_reco_level = ft.store_reco_level
            AND txn.date_id = %L
            %s
        GROUP BY ft.promo_id, ft.recommendation_date
    $fmt$, var_date, customer_join);

    -- Execute generated SQL
    EXECUTE sql_query;	
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 1 COMPLETED: Create temp table took: %', duration;

    -- Step 2: Delete existing data from tb_promo_date_basketdetails for this date
    RAISE NOTICE 'Step 2: Deleting existing data from tb_promo_date_basketdetails for date: %', var_date;
    step_start_time := clock_timestamp();
    
    DELETE FROM price_promo.tb_promo_date_basketdetails
    WHERE date = var_date;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 2 COMPLETED: Delete existing data took: %', duration;

    -- Step 3: Insert from UNLOGGED temp table to tb_promo_date_basketdetails
    RAISE NOTICE 'Step 3: Inserting into tb_promo_date_basketdetails';
    step_start_time := clock_timestamp();
    
    INSERT INTO price_promo.tb_promo_date_basketdetails (
        promo_id, 
        date,
        promo_offer_txn,
        promo_offer_units_per_txn, 
        promo_offer_avg_basket_size, 
        promo_offer_avg_margin,
        promo_offer_units, 
        promo_offer_revenue, 
        promo_offer_margin
    )
    SELECT 
        promo_id, 
        date,
        promo_offer_txn,
        promo_offer_units_per_txn, 
        promo_offer_avg_basket_size, 
        promo_offer_avg_margin,
        promo_offer_units, 
        promo_offer_revenue, 
        promo_offer_margin 
    FROM price_promo_opt_temp.tb_promo_date_basketdetails;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 3 COMPLETED: Insert into tb_promo_date_basketdetails took: %', duration;

    -- Step 4: Insert into main tb_promo_basketdetails for promos ending on var_date
    RAISE NOTICE 'Step 4: Aggregating and inserting into main tb_promo_basketdetails for promos ending on: %', var_date;
    step_start_time := clock_timestamp();
    
    -- First delete existing data for promos ending on var_date
    DELETE FROM price_promo.tb_promo_basketdetails
    WHERE promo_id IN (
        SELECT DISTINCT pm.promo_id
        FROM price_promo.promo_master pm
        WHERE pm.end_date = var_date
    );
    
    -- Then insert aggregated data
    INSERT INTO price_promo.tb_promo_basketdetails (
        promo_id, 
        promo_offer_txn,
        promo_offer_units_per_txn, 
        promo_offer_avg_basket_size, 
        promo_offer_avg_margin,
        promo_offer_units, 
        promo_offer_revenue, 
        promo_offer_margin
    )
    SELECT 
        pdb.promo_id,
        SUM(promo_offer_txn) AS promo_offer_txn,
        ROUND(COALESCE(SUM(promo_offer_units) / NULLIF(SUM(promo_offer_txn), 0), 0)::numeric, 2)::float8 AS promo_offer_units_per_txn,
        ROUND(COALESCE(SUM(promo_offer_revenue) / NULLIF(SUM(promo_offer_txn), 0), 0)::numeric, 2)::float8 AS promo_offer_avg_basket_size,
        ROUND(COALESCE(SUM(promo_offer_margin) / NULLIF(SUM(promo_offer_txn), 0), 0)::numeric, 2)::float8 AS promo_offer_avg_margin,
        SUM(promo_offer_units) AS promo_offer_units,
        SUM(promo_offer_revenue) AS promo_offer_revenue,
        SUM(promo_offer_margin) AS promo_offer_margin
    FROM price_promo.tb_promo_date_basketdetails pdb
    INNER JOIN price_promo.promo_master pm ON pm.promo_id = pdb.promo_id
    WHERE pm.end_date = var_date
    GROUP BY pdb.promo_id;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 4 COMPLETED: Insert into main tb_promo_basketdetails took: %', duration;
    
    -- Calculate overall duration
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE '=== pc_add_promo_basket_data COMPLETED in: % ===', duration;

END;
$procedure$
;

