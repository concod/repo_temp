
--liquibase formatted sql
--changeset vaibhav@:fn_get_promo_details._v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_promo_details

DROP FUNCTION IF EXISTS price_promo_opt.fn_get_promo_details ;    
     
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_promo_details(_promo_id integer)
 RETURNS TABLE(promo_id integer, start_date character varying, end_date character varying, ad_type integer, event_id integer, channel_type integer, vf_fixed_amount double precision, vf_per_unit double precision, week_start_date character varying, week_end_date character varying, store_selection_type integer)
 LANGUAGE plpgsql
AS $function$

BEGIN

    RETURN QUERY

    SELECT

        pm.promo_id::integer, 

        pm.start_date::varchar AS start_date, 

        pm.end_date::varchar AS end_date, 

        0::integer AS ad_type,

        0::integer AS event_id, 

        0::integer AS channel_type,

        COALESCE(ps.vf_fixed_amount, 0.0)::float AS vf_fixed_amount, 

        COALESCE(ps.vf_per_unit, 0.0)::float AS vf_per_unit,

        MIN(fdm.week_start_date)::varchar AS week_start_date,

        MAX(fdm.week_start_date)::varchar AS week_end_date,

        pm.store_selection_type::integer AS store_selection_type 

    FROM

        price_promo.promo_master pm 

    LEFT JOIN 

        (

            SELECT 

                fdmi.date_id, 

                fdmi.weeks_start_date AS week_start_date 

            FROM 

                global.tb_fiscal_date_mapping fdmi

        ) fdm

    ON fdm.date_id BETWEEN pm.start_date AND pm.end_date

    INNER JOIN 

        price_promo.ps_rules ps

    ON pm.promo_id = ps.promo_id

    WHERE

        pm.promo_id = _promo_id

    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8;

END;

$function$

;