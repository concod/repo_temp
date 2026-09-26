--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_pf_coefficient runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_pf_coefficient

DROP PROCEDURE if exists price_promo_opt.pc_simulation_pf_coefficient;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_pf_coefficient(IN var_promo_id integer, IN var_discount_filter_name character varying, IN var_end_date date, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



BEGIN



    EXECUTE format('



        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_pf_coefficient_%s_%s;



        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_pf_coefficient_%s_%s



        AS



        WITH



        avg_effective_discount AS materialized  (



            SELECT Distinct

                dd.scenario_id,

                dd.product_id,dd.store_hierarchy,dd.customer_id, 

                week_no, dd.s0_id,coefficient,

                dd.l3_cid, dd.brand_cid,

                dd.s1_id,

                dd.effective_discount AS effective_discount_promo, current_price

            FROM %s dd

            INNER JOIN price_promo_opt.tb_pullforward_coefficient_opt pf

            USING(s1_id, l3_cid, brand_cid)

            INNER JOIN (SELECT DISTINCT s0_id , s1_id FROM price_promo.fn_fetch_stores_for_promo(%s)

            INNER JOIN GLOBAL.tb_store_master USING(store_id)) is_s

            using(s1_id)

        ),



        recommended_discount AS materialized  (



            SELECT



                fin.product_id,fin.store_hierarchy,fin.customer_id, 



                fin.s1_id,s0_id,



                CASE



                    WHEN fin.recommendation_date BETWEEN %L AND %L THEN 1



                    WHEN fin.recommendation_date BETWEEN %L AND %L THEN 2



                END AS week_no,



                SUM(fin.effective_discount / 7) AS effective_discount



            FROM price_promo.ps_recommended_finalized fin



            WHERE fin.recommendation_date BETWEEN %L AND %L

            AND fin.promo_id IN (SELECT pmi.promo_id FROM price_promo.promo_master pmi

            WHERE pmi.status IN (8) AND pmi.start_date > %L)

            GROUP BY fin.product_id,fin.store_hierarchy,fin.customer_id,  fin.s1_id, s0_id, week_no



        )



        SELECT



            df.scenario_id,



            df.product_id,df.store_hierarchy,df.customer_id,  s1_id,s0_id,



			effective_discount_promo as effective_discount,



            SUM((df.effective_discount_promo - coalesce(ft.effective_discount,0)) * abs(coalesce(coefficient,0)) * 0.01)::FLOAT AS pf_coefficient



        FROM avg_effective_discount df



        LEFT JOIN recommended_discount ft



            USING(product_id, s1_id, week_no,s0_id,store_hierarchy,customer_id)





        WHERE df.effective_discount_promo > coalesce(ft.effective_discount,0)



        GROUP BY df.scenario_id, df.product_id,df.store_hierarchy, df.customer_id,  effective_discount_promo, s1_id, s0_id;





        CREATE INDEX IDX_promo_simulation_pf_coefficient_%s_%s

		ON price_promo_opt_temp.promo_simulation_pf_coefficient_%s_%s

		USING btree (product_id,s1_id,s0_id, effective_discount);





    ',



        var_promo_id, array_to_string(arr_scenario_id, '_'),

        var_promo_id, array_to_string(arr_scenario_id, '_'), var_discount_filter_name,

        var_promo_id,

        var_end_date + 1, var_end_date + 7,

        var_end_date + 8, var_end_date + 14,

        var_end_date + 1, var_end_date + 14, var_end_date,

        var_promo_id, array_to_string(arr_scenario_id, '_'),

        var_promo_id, array_to_string(arr_scenario_id, '_'));



END;



$procedure$



;