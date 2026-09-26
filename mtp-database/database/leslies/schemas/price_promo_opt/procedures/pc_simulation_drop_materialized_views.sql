--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_drop_materialized_views runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_drop_materialized_views

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_drop_materialized_views ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_drop_materialized_views(IN arr_promo_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

  query text ;

	table_name text;

BEGIN

table_name:= '';

    -- Construct the query for the materialized view

    query := format('

--        DROP MATERIALIZED VIEW IF EXISTS price_promo_opt_temp.%s;

--        CREATE MATERIALIZED VIEW price_promo_opt_temp.%s AS

--        SELECT

--            pp.promo_id, pp.product_id, pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid, pdm.l4_cid, pdm.brand_cid,

--            round(pdm.msrp::numeric, 2) AS msrp, round(pdm.current_price::numeric, 2) AS current_price,

--            round(pdm.cost::numeric, 2) AS cost, 

--            round(pdm.ecom_shipping_cost::numeric, 2) AS ecom_shipping_cost, 

--            NULL::integer AS pg_id, prm.promo_duration, 

--            product_selection_type, offer_distribution_channel, hierarchy_level_id, customer_type,

--            current_price AS avg_current_price

--        FROM (

--            SELECT *, LEAST(end_date - start_date + 1, 42) AS promo_duration

--            FROM price_promo.promo_master

--            WHERE promo_id = $1

--        ) prm

--        LEFT JOIN (

--            SELECT promo_id, MAX(hierarchy_level_id) AS hierarchy_level_id

--            FROM price_promo.included_promo_pg_hierarchy

--            WHERE promo_id = $1

--            GROUP BY promo_id

--

--            UNION ALL

--

--            SELECT promo_id, MAX(hierarchy_level_id) AS hierarchy_level_id

--            FROM price_promo.included_product_hierarchy

--            WHERE promo_id = $1

--            GROUP BY promo_id

--        ) prh USING(promo_id)

--        INNER JOIN price_promo.fn_fetch_products_for_promo($1) pp USING(promo_id)

--        INNER JOIN price_promo.product_master pdm USING(product_id);

--

--         Create indexes after the materialized view is created

--        CREATE INDEX idx_%s

--        ON price_promo_opt_temp.%s

--        USING btree (l3_cid, brand_cid);

--

--        CREATE INDEX idx_%s_l2

--        ON price_promo_opt_temp.%s

--        USING btree (l2_cid);

--

--        CREATE INDEX idx_%s_product

--        ON price_promo_opt_temp.%s

--        USING btree (product_id);



select 2



    ', table_name, table_name, table_name, table_name, table_name, table_name, table_name, table_name);



    -- Print the query for debugging

    RAISE NOTICE '%', query;



    -- Execute the query

    -- EXECUTE query USING var_promo_id;



END;

$procedure$
;
