--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_event_basket_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_event_basket_data

DROP PROCEDURE if exists price_promo_opt.pc_add_event_basket_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_event_basket_data(IN var_date date, IN customer_flag integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    duration interval;
    step_start_time timestamp;
	sql_query text;
	sql_query1 text;
	customer_select text;
    create_index_cols text;
	customer_join text;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE '=== STARTING pc_add_event_basket_data for date: % ===', var_date;

    -- Step 1: Create temp table with distinct event-product-store combinations
    RAISE NOTICE 'Step 1: Creating UNLOGGED temp table with distinct event-product-store combinations';
    step_start_time := clock_timestamp();
    
    DROP TABLE IF EXISTS price_promo_opt_temp.tb_event_combinations;

	IF customer_flag = 1 THEN
        customer_select := ', ft.customer_reco_level';
        create_index_cols := 'product_id, store_reco_level, customer_reco_level';
		customer_join := 'AND txn.customer_reco_level = ec.customer_reco_level';
    ELSE
        customer_select := '';
        create_index_cols := 'product_id, store_reco_level';
		customer_join := '';  -- remove join condition
    END IF;

    sql_query := format($fmt$
        CREATE UNLOGGED TABLE price_promo_opt_temp.tb_event_combinations AS
        SELECT DISTINCT
            pm.event_id,
            ft.product_id,
            ft.store_reco_level
            %s
        FROM price_promo_opt.current_finalized_promo_products AS ft
        INNER JOIN price_promo.promo_master pm USING (promo_id);

        CREATE INDEX idx_event_combinations_composite
        ON price_promo_opt_temp.tb_event_combinations (%s);
    $fmt$,
        customer_select,
        create_index_cols
    );

    -- Execute generated SQL
    EXECUTE sql_query;
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

    sql_query1 := format($fmt$
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
            %L AS date,
            COUNT(DISTINCT txn.transaction_id)::float8 AS event_offer_txn,
            ROUND(COALESCE(SUM(txn.quantity)::float / NULLIF(COUNT(DISTINCT txn.transaction_id), 0), 0)::numeric, 2)::float8 AS event_offer_units_per_txn,
            ROUND(COALESCE(SUM(txn.revenue)::float / NULLIF(COUNT(DISTINCT txn.transaction_id), 0), 0)::numeric, 2)::float8 AS event_offer_avg_basket_size,
            ROUND(COALESCE(SUM(txn.margin)::float / NULLIF(COUNT(DISTINCT txn.transaction_id), 0), 0)::numeric, 2)::float8 AS event_offer_avg_margin,
            SUM(COALESCE(txn.quantity, 0))::float8 AS event_offer_units,
            SUM(COALESCE(txn.revenue, 0))::float8 AS event_offer_revenue,
            SUM(COALESCE(txn.margin, 0))::float8 AS event_offer_margin
        FROM price_promo_opt_temp.tb_event_combinations ec
--        INNER JOIN price_promo_opt.promo_txn_agg AS txn
		INNER JOIN price_promo_opt.promo_txn_master AS txn
            ON txn.product_id = ec.product_id
            AND txn.store_reco_level = ec.store_reco_level
            %s
        WHERE txn.date_id = %L
        GROUP BY ec.event_id
    $fmt$,
        var_date,       -- %L for date in SELECT
        customer_join,  -- %s customer join condition or blank
        var_date        -- %L for date in WHERE
    );

    -- Execute generated SQL
    EXECUTE sql_query1;
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

