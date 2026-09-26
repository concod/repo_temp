--liquibase formatted sql
--changeset liquibase:pc_add_promo_basket_data_v2.4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_add_promo_basket_data_v2

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_promo_basket_data();

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_promo_basket_data()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    promo_txn_basket_table TEXT;
    query TEXT;
    promo_list_arr integer[];
BEGIN
    -- Fetch the list of promo_ids into an array
    SELECT coalesce(array_agg(DISTINCT promo_id), ARRAY[]::int[])::int[] INTO promo_list_arr
    FROM price_promo_opt.current_finished_promo_products;

    -- If promo_list_arr is empty, exit the procedure
    IF array_length(promo_list_arr, 1) IS NULL THEN
        RAISE NOTICE 'No promotions to process. Exiting procedure.';
        RETURN;
    END IF;

    -- Delete existing promo basket details for relevant promo_ids
    DELETE FROM price_promo.tb_promo_basketdetails
    WHERE promo_id = ANY(promo_list_arr);

    -- Build the SQL query for inserting promo basket details
    query := FORMAT(
        'INSERT INTO price_promo.tb_promo_basketdetails (
            promo_id, promo_offer_txn,
            promo_offer_units_per_txn, promo_offer_avg_basket_size, promo_offer_avg_margin,
            promo_offer_units, promo_offer_revenue, promo_offer_margin
        )(
            SELECT
                promo_id,
                COUNT(distinct transaction_id) AS promo_offer_txn,
                round(COALESCE((sum(quantity)::float/COUNT(distinct transaction_id)), 0)::numeric, 2) as promo_offer_units_per_txn,
                round(COALESCE((sum(revenue)::float/COUNT(distinct transaction_id)), 0)::numeric, 2) as promo_offer_avg_basket_size,
                round(COALESCE((sum(margin)::float/COUNT(distinct transaction_id)), 0)::numeric, 2) as promo_offer_avg_margin,
                SUM(COALESCE(quantity, 0)) AS promo_offer_units,
                SUM(COALESCE(revenue, 0)) AS promo_offer_revenue,
                SUM(COALESCE(margin, 0)) AS promo_offer_margin
            FROM
                price_promo_opt.current_finished_promo_products AS ft
                LEFT JOIN (SELECT DISTINCT * FROM price_promo.fn_fetch_stores_for_multiple_promos(%L)) pps
                    USING (promo_id)
                LEFT JOIN price_promo.promo_txn_basket as base
                ON base.product_id = ft.product_id
                AND pps.store_id = base.store_id
                AND base.date_id BETWEEN ft.start_date AND ft.end_date
            GROUP BY promo_id
        );', promo_list_arr
    );

    -- Execute the constructed query
    RAISE NOTICE 'Executing SQL QUERY: %', query;
    EXECUTE query;
END;
$procedure$
;
