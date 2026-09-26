--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_event_basket_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_event_basket_data

DROP PROCEDURE if exists price_promo_opt.pc_add_event_basket_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_event_basket_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query TEXT;
    promo_list_arr integer[];
BEGIN
    -- Fetch promo_ids
    SELECT COALESCE(array_agg(DISTINCT promo_id), ARRAY[]::int[]) INTO promo_list_arr
    FROM price_promo_opt.current_finished_promo_products;

    IF array_length(promo_list_arr, 1) IS NULL THEN
        RAISE NOTICE 'No promotions to process. Exiting procedure.';
        RETURN;
    END IF;

    -- Delete old data for affected event_ids
    DELETE FROM price_promo.tb_event_basketdetails
    WHERE event_id IN (
        SELECT pm.event_id
        FROM price_promo.promo_master pm
        WHERE pm.promo_id = ANY(promo_list_arr)
    );

    -- insert data
    query := FORMAT(
        $SQL$
        INSERT INTO price_promo.tb_event_basketdetails (
            event_id, event_offer_txn,
            event_offer_units_per_txn, event_offer_avg_basket_size, event_offer_avg_margin,
            event_offer_units, event_offer_revenue, event_offer_margin
        )
        WITH event_product_store_dates AS (
            SELECT DISTINCT
                pm.event_id,
                ft.product_id,
                pps.store_id,
                ft.start_date,
                ft.end_date
            FROM price_promo_opt.current_finished_promo_products ft
            LEFT JOIN price_promo.fn_fetch_stores_for_multiple_promos(%L) pps USING (promo_id)
            LEFT JOIN price_promo.promo_master pm ON ft.promo_id = pm.promo_id
            WHERE pm.event_id IS NOT NULL
        ),
        event_txns AS (
            SELECT
                epsd.event_id,
                base.transaction_id,
                base.quantity,
                base.revenue,
                base.margin
            FROM event_product_store_dates epsd
            JOIN price_promo.promo_txn_basket base
              ON epsd.product_id = base.product_id
              AND epsd.store_id = base.store_id
              AND base.date_id BETWEEN epsd.start_date AND epsd.end_date
        )
        SELECT
            event_id,
            COUNT(DISTINCT transaction_id) AS event_offer_txn,
            ROUND((SUM(quantity)::NUMERIC / NULLIF(COUNT(DISTINCT transaction_id), 0))::NUMERIC, 2) AS event_offer_units_per_txn,
            ROUND((SUM(revenue)::NUMERIC / NULLIF(COUNT(DISTINCT transaction_id), 0))::NUMERIC, 2) AS event_offer_avg_basket_size,
            ROUND((SUM(margin)::NUMERIC / NULLIF(COUNT(DISTINCT transaction_id), 0))::NUMERIC, 2) AS event_offer_avg_margin,
            SUM(quantity) AS event_offer_units,
            SUM(revenue) AS event_offer_revenue,
            SUM(margin) AS event_offer_margin
        FROM event_txns
        GROUP BY event_id
        $SQL$,
        promo_list_arr
    );
    EXECUTE query;
END;
$procedure$



;