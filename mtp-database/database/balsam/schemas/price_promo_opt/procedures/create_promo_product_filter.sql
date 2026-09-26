--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:create_promo_product_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for create_promo_product_filter

DROP PROCEDURE if exists price_promo_opt.create_promo_product_filter;
CREATE OR REPLACE PROCEDURE price_promo_opt.create_promo_product_filter(IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query varchar;

    table_name varchar := format('promo_product_filter_resim_%s_%s', var_promo_id, var_scenario_id);

BEGIN

-- Purpose: Creates a temporary filtered product table for promotional analysis and optimization.
-- Example: CALL price_promo_opt.create_promo_product_filter(12345, 100);
-- Other Functions Used:
--   * price_promo.fn_fetch_products_for_promo - Retrieves products eligible for the promotion
--   * price_promo.fn_fetch_promo_pg_product - Gets product group mappings (commented out)
-- Tables Used:
--   * price_promo.promo_master - Stores promotion master data including duration and dates
--   * price_promo.included_promo_pg_hierarchy - Contains product group hierarchy inclusions
--   * price_promo.included_product_hierarchy - Contains product hierarchy inclusions
--   * price_promo.product_master - Contains product details and pricing information
--   * price_promo.ps_rules - Contains promotion pricing rules
--   * price_promo_opt_temp.[dynamic_table_name] - Created temporary table with filtered products
-- Returns: No direct return value; creates an unlogged table with promotion-eligible products
--   including hierarchy information, pricing details, and promotion parameters


    -- Construct the query

    query := format('

        DROP TABLE IF EXISTS price_promo_opt_temp.%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.%s AS

        SELECT

            pp.promo_id, pp.product_id,  l0_cid, l0_id::integer as l0_id, l1_cid, pdm.l2_cid, pdm.l3_cid, NULL::integer as l4_cid, pdm.brand_cid,

            round(pdm.msrp::numeric,2) as msrp, round(pdm.msrp_with_vat::numeric,2) as current_price,

			round(pdm.cost::numeric,2) as cost,

			NULL::integer as ecom_shipping_cost, NULL::integer as pg_id, prm.promo_duration,

            product_selection_type, offer_distribution_channel, hierarchy_level_id, customer_type,

            current_price as avg_current_price, product_discount_level_id,pdm.currency_id

        FROM (

            SELECT *, LEAST(end_date - start_date + 1, 42) AS promo_duration

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

                    SELECT promo_id, MIN(hierarchy_level_id) as min_hierarchy_level_id, MAX(hierarchy_level_id) as max_hierarchy_level_id

                    FROM price_promo.included_promo_pg_hierarchy

                    WHERE promo_id = $1 and hierarchy_level_id<>-2

                    GROUP BY promo_id



                    UNION ALL



                    SELECT promo_id,  MIN(hierarchy_level_id) as min_hierarchy_level_id, MAX(hierarchy_level_id) as max_hierarchy_level_id

                    FROM price_promo.included_product_hierarchy

                    WHERE promo_id = $1 and hierarchy_level_id<>-2

                    GROUP BY promo_id



                    ) AS combined_data

                    GROUP BY promo_id



        ) prh USING(promo_id)

        INNER JOIN price_promo.fn_fetch_products_for_promo($1) pp USING(promo_id)

        INNER JOIN price_promo.product_master pdm USING(product_id)

		LEFT JOIN (SELECT 

    promo_id,

     case when (SELECT MIN(x) FROM unnest(product_discount_level) AS x) >= 1 then 1 else NULL end as product_discount_level_id

FROM price_promo.ps_rules

) pphl using(promo_id)

		;

        --LEFT JOIN price_promo.fn_fetch_promo_pg_product($1, prm.product_selection_type = 3) pg USING(product_id);



		CREATE INDEX idx_%s

		ON price_promo_opt_temp.%s

		USING btree (l3_cid, brand_cid);

		CREATE INDEX idx_%s_l2

		ON price_promo_opt_temp.%s

		USING btree (l2_cid);

		CREATE INDEX idx_%s_product

		ON price_promo_opt_temp.%s

		USING btree (product_id);



    ',table_name, table_name,table_name, table_name,table_name, table_name,table_name, table_name);



    -- Print the query

    RAISE NOTICE '%', query;



    -- Execute the query

    EXECUTE query USING var_promo_id;



END;

$procedure$



;