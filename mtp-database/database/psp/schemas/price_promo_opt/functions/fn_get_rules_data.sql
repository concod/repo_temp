--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_get_rules_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_rules_data

DROP FUNCTION if exists price_promo_opt.fn_get_rules_data;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_rules_data(_promo_id integer)
 RETURNS TABLE(promo_id integer, rule_id integer, min_discount double precision, max_discount double precision, discount_level integer, opt_discount_type_id integer, revenue_target double precision, revenue_priority integer, gross_margin_target double precision, gross_margin_priority integer, units_target double precision, units_priority integer, discount_type_values integer[], offer_type character varying, gross_margin_percent_target double precision, gross_margin_percent_priority integer, created_by integer, updated_by integer, created_at timestamp without time zone, updated_at timestamp without time zone, maximization_parameter character varying, min_upto_percent double precision, max_upto_percent double precision, products_on_max_upto_percent double precision, max_product_discount_level integer)
 LANGUAGE plpgsql
AS $function$



BEGIN



    RETURN QUERY



    SELECT



        pr.promo_id::integer, 



        pr.rule_id::integer,



        pr.min_discount::float, 



        pr.max_discount::float,



        pr.discount_level::integer, 



        pr.opt_discount_type_id::integer,



        pr.revenue_target::float, 



        pr.revenue_priority::integer,



        pr.gross_margin_target::float, 



        pr.gross_margin_priority::integer,



        pr.units_target::float, 



        pr.units_priority::integer, 



        pr.discount_type_values::integer[],



        tasm.name::varchar as offer_type,



        pr.gross_margin_percent_target::float, 



        pr.gross_margin_percent_priority::integer,



        pr.created_by::integer,



        pr.updated_by::integer,



        pr.created_at::timestamp,



        pr.updated_at::timestamp,

		pr.maximization_parameter::varchar,

		pr.min_upto_percent::float,

		pr.max_upto_percent::float,	

		pr.products_on_max_upto_percent::float,
		(SELECT MAX(x) FROM unnest(pr.product_discount_level) AS x)::integer AS max_product_discount_level



    FROM



        price_promo.ps_rules pr



    LEFT JOIN



        (SELECT * FROM metaschema.tb_app_sub_master WHERE master_id = 2) tasm 



    ON pr.opt_discount_type_id = tasm.id



    WHERE



        pr.promo_id = _promo_id;



END;



$function$
;

