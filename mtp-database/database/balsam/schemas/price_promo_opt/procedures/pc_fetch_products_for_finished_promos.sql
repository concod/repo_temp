--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_fetch_products_for_finished_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_fetch_products_for_finished_promos

DROP PROCEDURE if exists price_promo_opt.pc_fetch_products_for_finished_promos;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_fetch_products_for_finished_promos(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    distinct_promo_id int4;

    distinct_start_date date;

    distinct_end_date date;

BEGIN

    TRUNCATE TABLE price_promo_opt.current_finished_promo_products;



    -- Retrieve distinct promo_id

    FOR distinct_promo_id, distinct_start_date, distinct_end_date IN

        SELECT DISTINCT promo_id, start_date, end_date

        FROM price_promo.promo_master pm

		WHERE

			status = 8

			AND end_date = var_date

    LOOP

        -- Insert the data

        INSERT INTO price_promo_opt.current_finished_promo_products

        SELECT

			distinct_promo_id as promo_id, product_id,

			distinct_start_date AS start_date, distinct_end_date as end_date

        FROM (

				(

                SELECT a.product_id

                FROM unnest(price_promo.fn_get_promo_final_products(distinct_promo_id, 0)) AS a(product_id)

                INNER JOIN (

                    SELECT product_id

                    FROM price_promo_opt.promo_txn

                    WHERE date_id = var_date - INTERVAL '1 year'

                    UNION ALL

                    SELECT product_id

                    FROM price_promo_opt.promo_txn

                    WHERE date_id = var_date - INTERVAL '1 week'

                ) b

                ON a.product_id = b.product_id

                group by 1

                )

				UNION ALL

				SELECT unnest(price_promo.fn_get_promo_final_products(distinct_promo_id, 1)) AS product_id

			) AS prod_data;

    END LOOP;

END;

$procedure$



;