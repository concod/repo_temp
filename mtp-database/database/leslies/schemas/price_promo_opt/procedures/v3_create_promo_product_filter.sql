--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:v3_create_promo_product_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for v3_create_promo_product_filter

DROP PROCEDURE IF EXISTS price_promo_opt.v3_create_promo_product_filter ;
CREATE OR REPLACE PROCEDURE price_promo_opt.v3_create_promo_product_filter(IN var_promo_id integer, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

    table_name varchar := format('promo_product_filter_resim_%s_%s', var_promo_id, array_to_string(arr_scenario_id, '_'));

BEGIN

    -- Construct the dynamic SQL query using format and a dollar-quoted string for better readability

    query := format($sql$

        DROP TABLE IF EXISTS price_promo_opt_temp.%s;

        

        CREATE UNLOGGED TABLE price_promo_opt_temp.%s AS

        SELECT

            pp.promo_id,

            pp.product_id,

            NULL::integer AS l0_cid,

            NULL::integer AS l1_cid,

            pdm.l2_cid,

            pdm.l3_cid,

            NULL::integer AS l4_cid,

            pdm.brand_cid,

            round(pdm.msrp::numeric, 2) AS msrp,

            round(pdm.current_price::numeric, 2) AS current_price,

            round(pdm.cost::numeric, 2) AS cost,

            round(pdm.ecom_shipping_cost::numeric, 2) AS ecom_shipping_cost,

            NULL::integer AS pg_id,

            prm.promo_duration,

            product_selection_type,

            offer_distribution_channel,

            hierarchy_level_id,

            customer_type,

            current_price AS avg_current_price

        FROM (

            SELECT *,

                   LEAST(end_date - start_date + 1, 42) AS promo_duration

            FROM price_promo.promo_master

            WHERE promo_id = $1

        ) prm

        LEFT JOIN (

            SELECT promo_id,

                   MIN(CASE

                           WHEN min_hierarchy_level_id >= 0 THEN max_hierarchy_level_id

                           ELSE 0

                       END) AS hierarchy_level_id

            FROM (

                SELECT promo_id,

                       MIN(hierarchy_level_id) AS min_hierarchy_level_id,

                       MAX(hierarchy_level_id) AS max_hierarchy_level_id

                FROM price_promo.included_promo_pg_hierarchy

                WHERE promo_id = $1 AND hierarchy_level_id <> -2

                GROUP BY promo_id



                UNION ALL



                SELECT promo_id,

                       MIN(hierarchy_level_id) AS min_hierarchy_level_id,

                       MAX(hierarchy_level_id) AS max_hierarchy_level_id

                FROM price_promo.included_product_hierarchy

                WHERE promo_id = $1 AND hierarchy_level_id <> -2

                GROUP BY promo_id

            ) AS combined_data

            GROUP BY promo_id

        ) prh USING(promo_id)

        INNER JOIN price_promo.fn_fetch_products_for_promo($1) pp USING(promo_id)

        INNER JOIN price_promo.product_master pdm USING(product_id);

        

        CREATE INDEX idx_%s

            ON price_promo_opt_temp.%s

            USING btree (l3_cid, brand_cid);

        

        CREATE INDEX idx_%s_l2

            ON price_promo_opt_temp.%s

            USING btree (l2_cid);

        

        CREATE INDEX idx_%s_product

            ON price_promo_opt_temp.%s

            USING btree (product_id);

    $sql$,

        table_name, table_name,  -- for DROP and CREATE TABLE

        table_name, table_name,  -- for first index: name and table name

        table_name, table_name,  -- for second index: name and table name

        table_name, table_name   -- for third index: name and table name

    );

    

    -- Print the constructed query for debugging purposes

    RAISE NOTICE '%', query;

    

    -- Execute the dynamic SQL query with var_promo_id bound to the $1 placeholder

    EXECUTE query USING var_promo_id;

END;

$procedure$
;
