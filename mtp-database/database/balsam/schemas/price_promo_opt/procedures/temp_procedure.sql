--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:temp_procedure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for temp_procedure

DROP PROCEDURE if exists price_promo_opt.temp_procedure;
CREATE OR REPLACE PROCEDURE price_promo_opt.temp_procedure(IN var_promo_id integer, IN var_discount_filter_name text, IN var_end_date date, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

declare

	query text;

BEGIN

    query := format('

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_pf_coefficient_%s_%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_pf_coefficient_%s_%s

        AS

        WITH

        avg_effective_discount AS (

            SELECT Distinct

                dd.scenario_id,

                dd.product_id,

                dd.l3_cid, dd.brand_cid,

                dd.s1_id,

                dd.effective_discount AS effective_discount_promo, current_price

            FROM %s dd

        ),

        recommended_discount AS (

            SELECT

                fin.product_id,

                fin.s1_id,

                CASE

                    WHEN fin.recommendation_date BETWEEN %L AND %L THEN 1

                    WHEN fin.recommendation_date BETWEEN %L AND %L THEN 2

                END AS week_no,

                SUM(fin.effective_discount / 7) AS effective_discount,

			avg(discounted_price) as discounted_price

            FROM price_promo.ps_recommended_finalized fin

            WHERE fin.recommendation_date BETWEEN %L AND %L

            AND fin.promo_id IN (SELECT pmi.promo_id FROM price_promo.promo_master pmi WHERE pmi.status IN (8) AND pmi.start_date > %L)



            GROUP BY fin.product_id, fin.s1_id, week_no

        )

        SELECT

            df.scenario_id,

            df.product_id,

			effective_discount_promo as effective_discount, discounted_price as pf_price,

            SUM(ft.effective_discount * pf.coefficient * 0.01)::FLOAT AS pf_coefficient

        FROM avg_effective_discount df

        INNER JOIN recommended_discount ft

            USING(product_id, s1_id)

        INNER JOIN price_promo_opt.tb_pullforward_coefficient_opt pf

            USING(s1_id, week_no, l3_cid, brand_cid)

        WHERE df.effective_discount_promo > ft.effective_discount

        GROUP BY df.scenario_id, df.product_id, effective_discount_promo, discounted_price;

    ',

        var_promo_id, array_to_string(arr_scenario_id, '_'),

        var_promo_id, array_to_string(arr_scenario_id, '_'), var_discount_filter_name,

        var_end_date + 1, var_end_date + 7,

        var_end_date + 8, var_end_date + 14,

        var_end_date + 1, var_end_date + 14, var_end_date);

	RAISE NOTICE 'Executing SQL QUERY: %', query;

	EXECUTE query;

END;

$procedure$



;