--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:test_create_promo_product_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for test_create_promo_product_filter

DROP PROCEDURE IF EXISTS price_promo_opt.test_create_promo_product_filter ;
CREATE OR REPLACE PROCEDURE price_promo_opt.test_create_promo_product_filter(IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

    table_name varchar;

BEGIN

    -- Set table name

    table_name := format('promo_product_filter_resim_%s_%s', var_promo_id, var_scenario_id);



    -- Construct the query

    query := format('

        -- Drop existing table if any

        DROP TABLE IF EXISTS price_promo_opt_temp.%s;



        -- Create new table with product filter data

        CREATE UNLOGGED TABLE price_promo_opt_temp.%s AS

        WITH 

        -- Step 1: Get promotion details with duration

        promo_details AS (

            SELECT 

                *,

                LEAST(end_date - start_date + 1, 42) AS promo_duration

            FROM price_promo.promo_master

            WHERE promo_id = $1

        ),

        

        -- Step 2: Get hierarchy level information

        hierarchy_info AS (

            SELECT 

                promo_id,

                MIN(CASE

                    WHEN min_hierarchy_level_id >= 0 THEN max_hierarchy_level_id

                    ELSE 0

                END) AS hierarchy_level_id

            FROM (

                -- Combine hierarchy data from both tables

                SELECT 

                    promo_id, 

                    MIN(hierarchy_level_id) as min_hierarchy_level_id, 

                    MAX(hierarchy_level_id) as max_hierarchy_level_id

                FROM price_promo.included_promo_pg_hierarchy

                WHERE promo_id = $1 

                AND hierarchy_level_id <> -2

                GROUP BY promo_id



                UNION ALL



                SELECT 

                    promo_id,  

                    MIN(hierarchy_level_id) as min_hierarchy_level_id, 

                    MAX(hierarchy_level_id) as max_hierarchy_level_id

                FROM price_promo.included_product_hierarchy

                WHERE promo_id = $1 

                AND hierarchy_level_id <> -2

                GROUP BY promo_id

            ) AS combined_data

            GROUP BY promo_id

        )



        -- Step 3: Final product selection with all required fields

        SELECT

            pp.promo_id,

            pp.product_id,

            NULL::integer as l0_cid,

            NULL::integer as l1_cid,

            pdm.l2_cid,

            pdm.l3_cid,

            NULL::integer as l4_cid,

            pdm.brand_cid,

            round(pdm.msrp::numeric, 2) as msrp,

            round(pdm.current_price::numeric, 2) as current_price,

            round(pdm.cost::numeric, 2) as cost,

            round(pdm.ecom_shipping_cost::numeric, 2) as ecom_shipping_cost,

            NULL::integer as pg_id,

            prm.promo_duration,

            prm.product_selection_type,

            prm.offer_distribution_channel,

            hi.hierarchy_level_id,

            prm.customer_type,

            pdm.current_price as avg_current_price

        FROM promo_details prm

        LEFT JOIN hierarchy_info hi USING(promo_id)

        INNER JOIN price_promo.fn_fetch_products_for_promo($1) pp USING(promo_id)

        INNER JOIN price_promo.product_master pdm USING(product_id);



        -- Create indexes for better performance

        CREATE INDEX idx_%s ON price_promo_opt_temp.%s USING btree (l3_cid, brand_cid);

        CREATE INDEX idx_%s_l2 ON price_promo_opt_temp.%s USING btree (l2_cid);

        CREATE INDEX idx_%s_product ON price_promo_opt_temp.%s USING btree (product_id);

    ',

    table_name, table_name,

    table_name, table_name,

    table_name, table_name,

    table_name, table_name);



    -- Print the query for debugging

    RAISE NOTICE '%', query;



    -- Execute the query

    EXECUTE query USING var_promo_id;



END;

$procedure$
;
