--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_offer_attractiveness_factor runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_offer_attractiveness_factor

DROP PROCEDURE if exists price_promo_opt.pc_simulation_offer_attractiveness_factor;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_offer_attractiveness_factor(IN var_discount_filter_name character varying, IN promo_id integer, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



BEGIN



    EXECUTE format('



        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_offer_attractiveness_factor_%s_%s;



        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_offer_attractiveness_factor_%s_%s



        AS



--        WITH cte1 AS (



--            SELECT 

--				distinct



--                fd.scenario_id,

--				offer_identifier,



--                fd.product_id, 



--                fd.l2_cid, 



--                fd.msrp, 



--                fd.effective_discount, 



--                oaf.min_product_concentration,



--                oaf.brand_category,



--                oaf.factor, count(*) OVER(PARTITION BY fd.scenario_id, fd.l2_cid) AS total_count



--            FROM 



--                %s fd



--            INNER JOIN



--                price_promo_opt.tb_offer_attractiveness_factor_opt oaf



--            ON 



--                fd.l2_cid = oaf.l2_cid 



--                AND fd.effective_discount > oaf.min_discount_range  



--                AND fd.effective_discount <= oaf.max_discount_range 



--                AND fd.msrp > oaf.min_msrp_range 



--                AND fd.msrp <= oaf.max_msrp_range

--

--			---- this effective discount should be total eff disc. on top of msrp



--        ),



--        cte2 AS (



--            SELECT cte1.scenario_id,



--                cte1.l2_cid, 



--                brand_category, 



--                count(*) * 100 / cte1.total_count::float AS percentage 



--            FROM cte1



--            GROUP BY cte1.scenario_id, l2_cid, brand_category, cte1.total_count



--        )



--        SELECT 



--            cte1.scenario_id,



--            cte1.product_id, 



--            cte1.effective_discount,



--            COALESCE(



--                CASE 



--                    WHEN cte2.percentage >= cte1.min_product_concentration THEN cte1.factor 



--                END, 



--                1



--            )::float AS attractiveness_factor



--        FROM cte1



--        INNER JOIN cte2 



--        ON cte1.l2_cid = cte2.l2_cid 



--        AND cte1.brand_category = cte2.brand_category



--        AND cte1.scenario_id = cte2.scenario_id;

	select 	NULL::int4 as scenario_id , null::int8 as product_id, null::float as effective_discount, null::float  as attractiveness_factor

	limit 0;





    ', promo_id, array_to_string(arr_scenario_id, '_'), promo_id, array_to_string(arr_scenario_id, '_'), var_discount_filter_name);



END;



$procedure$



;