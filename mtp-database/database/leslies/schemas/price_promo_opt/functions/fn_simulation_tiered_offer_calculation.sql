--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_simulation_tiered_offer_calculation runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_simulation_tiered_offer_calculation

DROP FUNCTION IF EXISTS price_promo_opt.fn_simulation_tiered_offer_calculation ;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_simulation_tiered_offer_calculation(_tier_ids integer[])
 RETURNS TABLE(tier_id integer, offer_type_id integer, offer_type character varying, offer_x_value double precision, offer_x_type character varying, offer_y_value double precision, offer_y_type character varying, offer_z_value double precision, offer_z_type character varying, tiered_offer_indicator integer, max_tier integer)
 LANGUAGE plpgsql
AS $function$



BEGIN



    RETURN QUERY



    SELECT 



        sub1.tier_id,



        sub1.offer_type_id,



        sub1.offer_type,



        avg(sub1.offer_x_value) AS offer_x_value,



        sub1.offer_x_type,



        avg(sub1.offer_y_value) AS offer_y_value,



        sub1.offer_y_type,



        avg(sub1.offer_z_value) AS offer_z_value,



        sub1.offer_z_type,



        CASE 



            WHEN sub1.tier_tag = '1' THEN 1



            ELSE 0 



        END::integer AS tiered_offer_indicator,



        count(*)::integer AS max_tier



    FROM (



        SELECT 



            tm.tier_id,



            tm.offer_type_id,



            tm.offer_type,



            td.offer_x_value,



            td.offer_x_type,



            td.offer_y_value,



            td.offer_y_type,



            td.offer_z_value,



            td.offer_z_type,



--            CASE

--

--                WHEN (td.offer_x_type = 'dollar' AND (td.offer_y_type = 'percent_off' OR td.offer_y_type = 'dollar_off')) THEN '1'

--

--                ELSE td.display_name

--

--            END AS tier_tag



            1 AS tier_tag



        FROM 



            price_promo.tier_master tm



        INNER JOIN 



            price_promo.tier_discounts td ON tm.tier_id = td.tier_id



        WHERE 



            tm.tier_id = any(_tier_ids)



    ) sub1



    GROUP BY 



        sub1.tier_id, sub1.offer_type_id, sub1.offer_type, sub1.offer_x_type, sub1.offer_y_type, sub1.offer_z_type,  sub1.tier_tag;



END;



$function$
;
