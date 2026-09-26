--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_event_basket_datav1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_event_basket_datav1

DROP PROCEDURE if exists price_promo_opt.pc_add_event_basket_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_event_basket_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    query TEXT;
    event_list_arr integer[];
    promo_list_arr integer[];
BEGIN
    -- Fetch event_ids that ended on var_date
    SELECT COALESCE(array_agg(DISTINCT event_id), ARRAY[]::int[])
    INTO event_list_arr
    FROM price_promo.event_master
    WHERE end_date = var_date;

    -- Exit if no events
    IF array_length(event_list_arr, 1) IS NULL THEN
        RAISE NOTICE 'No events to process for date %.', var_date;
        RETURN;
    END IF;

    -- Fetch related promo_ids
    SELECT COALESCE(array_agg(DISTINCT promo_id), ARRAY[]::int[])
    INTO promo_list_arr
    FROM price_promo.promo_master
    WHERE event_id = ANY(event_list_arr);

    -- Delete old data first
    DELETE FROM price_promo.tb_event_basketdetails
    WHERE event_id = ANY(event_list_arr);

    -- Insert new data
    query := FORMAT(
        $SQL$
        INSERT INTO price_promo.tb_event_basketdetails (
            event_id, event_offer_txn,
            event_offer_units_per_txn, event_offer_avg_basket_size, event_offer_avg_margin,
            event_offer_units, event_offer_revenue, event_offer_margin
        )
        WITH event_product_store_dates AS (
            SELECT distinct
                ce.event_id,
              --  pm.promo_id,
                pp.product_id,
                pm.start_date AS promo_start,
                pm.end_date   AS promo_end
				--,pps.store_id
            FROM price_promo.event_master ce
            JOIN price_promo.promo_master pm
              ON ce.event_id = pm.event_id
            JOIN price_promo.promo_product pp
              ON pm.promo_id = pp.promo_id
--            LEFT JOIN price_promo.fn_fetch_stores_for_multiple_promos(%L) pps 
--			  ON pm.promo_id = pps.promo_id
            WHERE ce.event_id = ANY(%L)
        ),
        event_txns AS (
            SELECT
                epsd.event_id,
                base.transaction_id,
                base.quantity,
                base.revenue,
                base.margin
            FROM price_promo_opt.promo_txn_master base
            JOIN event_product_store_dates epsd
              ON base.product_id = epsd.product_id
             --AND base.store_id  = epsd.store_id
             AND base.date_id  BETWEEN epsd.promo_start AND epsd.promo_end
        ),
        txn_agg AS (
            SELECT
                event_id,
                COUNT(DISTINCT transaction_id) AS txn_count,
                SUM(quantity) AS total_qty,
                SUM(revenue)  AS total_revenue,
                SUM(margin)   AS total_margin
            FROM event_txns
            GROUP BY event_id
        )
        SELECT
            event_id,
            txn_count AS event_offer_txn,
            ROUND(total_qty::NUMERIC / NULLIF(txn_count, 0), 2)   AS event_offer_units_per_txn,
            ROUND(total_revenue::NUMERIC / NULLIF(txn_count, 0), 2) AS event_offer_avg_basket_size,
            ROUND(total_margin::NUMERIC / NULLIF(txn_count, 0), 2) AS event_offer_avg_margin,
            total_qty    AS event_offer_units,
            total_revenue AS event_offer_revenue,
            total_margin  AS event_offer_margin
        FROM txn_agg
        $SQL$,
        promo_list_arr,   -- pass promo ids first
        event_list_arr    -- then events
    );
	raise notice '%',query;

    EXECUTE query;
END;
$procedure$
;