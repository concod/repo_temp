
--liquibase formatted sql
--changeset vaibhav@:pc_simulation_cannibalization_coefficient_stack._v9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_cannibalization_coefficient_stack

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_cannibalization_coefficient_stack ;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_cannibalization_coefficient_stack(IN var_promo_id integer, IN var_discount_filter_name text, IN var_start_date date, IN var_end_date date, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN

    EXECUTE format('

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_cannibalization_coefficient_stack_%s_%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_cannibalization_coefficient_stack_%s_%s

        AS

        WITH discount_data AS materialized  (

            SELECT

                dd.scenario_id, dd.s0_id, dd.s1_id, dd.l3_cid,l2_cid, dd.brand_cid, dd.offer_identifier,date,

                avg(dd.effective_discount) AS effective_discount_promo

            FROM %s dd

            GROUP BY dd.scenario_id,dd.date, dd.s0_id, dd.s1_id, dd.l3_cid,l2_cid, dd.brand_cid, dd.offer_identifier

        ),

        finalized_discount AS materialized  (

            SELECT

                a.s1_id, s0_id, pm.l3_cid, pm.brand_cid, a.recommendation_date,

                avg(a.effective_discount) AS effective_discount

            FROM (

                SELECT

                    fin.s1_id,s0_id, fin.product_id, fin.recommendation_date, fin.effective_discount

                FROM price_promo.ps_recommended_finalized fin

                WHERE

                    fin.recommendation_date BETWEEN %L AND %L
                        AND fin.promo_id IN (
                        SELECT pmi.promo_id FROM price_promo.promo_master pmi WHERE pmi.status IN (8))
            ) a

            INNER JOIN (SELECT * FROM price_promo.product_master WHERE active IS TRUE AND product_id NOT IN (
                        SELECT pp.product_id
                        FROM price_promo.fn_fetch_products_for_promo(%s) pp
                    ) AND l2_cid IN (SELECT DISTINCT l2_cid FROM discount_data) ) pm USING(product_id)
            GROUP BY a.s1_id, s0_id, pm.l3_cid, pm.brand_cid, a.recommendation_date
        )

        SELECT

            df.scenario_id,

            df.s1_id, df.s0_id, df.l3_cid, df.brand_cid,

            (ft.recommendation_date - %L + 1)::integer AS promo_day,

            df.offer_identifier AS offer_identifier,recommendation_date as promo_date, week_start_date as promo_week,

            sum((ft.effective_discount) * abs(coalesce(cf.coefficient,0)) *0.01)::float AS cb_coefficient

        FROM discount_data df

        INNER JOIN price_promo_opt.tb_cannibalization_coefficient_opt cf

            ON df.l3_cid = cf.cannibalized_l3_cid

            AND df.brand_cid = cf.cannibalized_brand_cid

            AND df.s1_id = cf.s1_id

        INNER JOIN finalized_discount ft

            ON ft.l3_cid = cf.cannibalizer_l3_cid

            AND ft.brand_cid = cf.cannibalizer_brand_cid

            AND ft.s1_id = cf.s1_id
			AND ft.s0_id = df.s0_id
			and ft.recommendation_date = df.date

      LEFT join
        (select date_id, weeks_start_date as week_start_date from  "global".tb_fiscal_date_mapping
            where date_id BETWEEN %L AND %L) fc
        on ft.recommendation_date = fc.date_id

        WHERE ft.effective_discount > df.effective_discount_promo

        GROUP BY df.s0_id,df.date, df.s1_id, df.scenario_id,df.offer_identifier, df.l3_cid, df.brand_cid,
                 promo_day ,recommendation_date, week_start_date;

--
--		CREATE INDEX IDX_promo_simulation_cannibalization_identi_level_%s_%s
--		ON price_promo_opt_temp.promo_simulation_cannibalization_coefficient_stack_%s_%s
--		USING btree (scenario_id, s1_id, s0_id, brand_cid, promo_day, l3_cid, offer_identifier);

    ', var_promo_id, array_to_string(arr_scenario_id, '_'),
   var_promo_id, array_to_string(arr_scenario_id, '_'), var_discount_filter_name,
   var_start_date, var_end_date, var_promo_id, var_start_date, var_start_date, var_end_date
   , var_promo_id, array_to_string(arr_scenario_id, '_'), var_promo_id, array_to_string(arr_scenario_id, '_'));

END;

$procedure$
;
