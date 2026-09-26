
--liquibase formatted sql
--changeset vaibhav@:pc_simulation_create_discount_filter._v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_create_discount_filter

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_create_discount_filter ;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_discount_filter(IN var_promo_id integer, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query TEXT;

BEGIN

    -- Construct the query

    query := format('

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_scenario_discount_filter_%s_%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_scenario_discount_filter_%s_%s AS

        (

WITH

opt_offer AS  materialized (select *,
Least(greatest(
CASE
    WHEN offer_type = ''percent_off'' THEN offer_x_value
    WHEN offer_type = ''extra_amount_off'' THEN ((offer_x_value / current_price) * 100)
    WHEN offer_type = ''fixed_price'' THEN (((current_price - offer_x_value) / current_price) * 100)
    WHEN offer_type = ''bxgy_percent_off'' THEN ((offer_z_value*0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100
    WHEN offer_type = ''bxgy'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)
    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' and offer_y_type = ''percent_off'' THEN offer_y_value
    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' and offer_y_type = ''percent_off'' THEN offer_y_value
    WHEN offer_type = ''bmsm'' and offer_x_type = ''dollar'' and offer_y_type = ''dollar_off''  THEN ((offer_y_value / offer_x_value) * 100)
    WHEN offer_type = ''bmsm'' and offer_x_type = ''unit'' and offer_y_type = ''dollar_off''  THEN ((offer_y_value / (offer_x_value*current_price)) * 100)
    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit''  and offer_y_type = ''at_dollar'' THEN (((current_price-(offer_y_value / offer_x_value)) / current_price) * 100)
END ,0),100) AS calculated_discount,

Least(greatest(CASE

    WHEN offer_type = ''percent_off'' THEN offer_x_value
    WHEN offer_type = ''extra_amount_off'' THEN ((offer_x_value / avg_current_price) * 100)
    WHEN offer_type = ''fixed_price'' THEN (((avg_current_price - offer_x_value) / avg_current_price) * 100)
    WHEN offer_type = ''bxgy_percent_off'' THEN ((offer_z_value*0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100
    WHEN offer_type = ''bxgy'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)
    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' and offer_y_type = ''percent_off'' THEN offer_y_value
    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' and offer_y_type = ''percent_off'' THEN offer_y_value
    WHEN offer_type = ''bmsm'' and offer_x_type = ''dollar'' and offer_y_type = ''dollar_off''  THEN ((offer_y_value / offer_x_value) * 100)
    WHEN offer_type = ''bmsm'' and offer_x_type = ''unit'' and offer_y_type = ''dollar_off''  THEN ((offer_y_value / (offer_x_value*avg_current_price)) * 100)
    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit''  and offer_y_type = ''at_dollar'' THEN (((avg_current_price-(offer_y_value / offer_x_value)) / avg_current_price) * 100)
END*0.01,0),1) AS temp_discount,

(CASE
    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' THEN offer_x_value/avg_current_price
    WHEN offer_type in (''bmsm'', ''bxgy'', ''bxgy_percent_off'') AND offer_x_type = ''unit'' THEN offer_x_value
END)-1 AS exp_qty

 from (

select promo_id,scenario_id, product_id, l0_cid, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid,pg_id, msrp, current_price,avg_current_price, offer_distribution_channel,

customer_type,product_selection_type,hierarchy_level_id,

cost, ecom_shipping_cost,

promo_duration, discount_level, created_by, created_at,

	CASE

    WHEN discount_level = -200 THEN -200

    WHEN discount_level = -1 THEN pf.brand_cid

    WHEN discount_level = 0 THEN pf.l0_cid

    WHEN discount_level = 1 THEN pf.l1_cid

    WHEN discount_level = 2 THEN pf.l2_cid

    WHEN discount_level = 3 THEN pf.l3_cid

    WHEN discount_level = 4 THEN pf.l4_cid

    WHEN discount_level = 5 THEN pf.product_id

    WHEN discount_level = 7 Then pf.pg_id

    END AS discount_level_value from price_promo_opt_temp.promo_product_filter_resim_%s_%s pf

left join (

select promo_id, scenario_id, discount_level, created_by, created_at from  price_promo.scenario_master

	where promo_id = %s and scenario_id = any(''%s'')

	) sm using(promo_id) ) sub1



left join (

SELECT

  psd.promo_id AS promo_id,

  scenario_id,

  psd.discount_level_value AS discount_level_value,

  COALESCE(tpsd.offer_type_id, psd.offer_type_id) AS offer_type_id,

  COALESCE(tpsd.offer_type, psd.offer_type) AS offer_type,

  COALESCE(tpsd.offer_x_value, psd.offer_x_value) AS offer_x_value,

  COALESCE(tpsd.offer_x_type, psd.offer_x_type) AS offer_x_type,

  COALESCE(tpsd.offer_y_value, psd.offer_y_value) AS offer_y_value,

  COALESCE(tpsd.offer_y_type, psd.offer_y_type) AS offer_y_type,

  COALESCE(tpsd.offer_z_value, psd.offer_z_value) AS offer_z_value,

  COALESCE(tpsd.offer_z_type, psd.offer_z_type) AS offer_z_type,

  COALESCE(tpsd.tier_id, psd.tier_id) AS tier_id,

  psd.offer_type_combined_display_name AS offer_type_combined_display_name,

  COALESCE(tpsd.max_tier,1) AS max_tier,

  COALESCE(tpsd.tiered_offer_indicator,0) AS tiered_offer_indicator

FROM (

  SELECT *

  FROM price_promo.ps_scenario_discounts

  WHERE promo_id = %s

    AND scenario_id = any(''%s'')

) psd



LEFT JOIN price_promo_opt.fn_simulation_tiered_offer_calculation(''%s'') tpsd USING(tier_id)

)sub2

using(promo_id, scenario_id, discount_level_value)),



final_discount AS (

SELECT

oo.promo_id, oo.scenario_id, oo.discount_level_value,l0_cid, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid,pg_id, oo.product_id, oo.current_price,

msrp, oo.cost, ecom_shipping_cost, s1_id, promo_duration,

oo.offer_type_id, oo.offer_type,

 offer_x_value,  oo.offer_x_type, offer_y_value,  oo.offer_y_type, offer_z_value,

oo.offer_z_type,  oo.tier_id,  oo.offer_type_combined_display_name,  calculated_discount,
COALESCE(
    CASE
        WHEN exp_qty > 0 THEN
            GREATEST(0.3, LEAST(0.98, POWER(0.85, (exp_qty - (LEAST(ROUND((ceil(temp_discount * 10*1000)/1000.0)::numeric,2), 3) * temp_discount)))))
        ELSE 1
    END,
1) AS penetration_factor,
offer_distribution_channel,customer_type,
 product_selection_type, hierarchy_level_id, discount_level, created_by, created_at

FROM opt_offer oo

cross join (

		SELECT DISTINCT s1_id FROM price_promo.fn_fetch_stores_for_promo(%s)

		inner join (select store_id, s1_id from global.tb_store_master) smi

		using(store_id)) ss
 )



 SELECT

	promo_id, scenario_id, discount_level_value, fd.l2_cid, l3_cid, brand_cid,

 	pg_id, product_id, current_price, msrp, cost, ecom_shipping_cost, fd.s1_id, promo_duration, discount_level, created_by, created_at

 	,offer_type_id, offer_type,
	 round(calculated_discount::numeric,2) as calculated_discount , penetration_factor,

 	round(coalesce(calculated_discount*penetration_factor,0)::numeric,2) as effective_discount ,offer_distribution_channel,customer_type,

 	product_selection_type,hierarchy_level_id,

CASE

    WHEN coalesce(calculated_discount*penetration_factor,0) >= 95 THEN 95

    ELSE FLOOR(coalesce(calculated_discount*penetration_factor,0) / 5) * 5 + CASE WHEN coalesce(calculated_discount*penetration_factor,0)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END

    END::integer AS base_percentage,

0 as offer_identifier,


 case when coalesce(calculated_discount*penetration_factor,0) >= 10
        then (coalesce(CASE WHEN product_selection_type IN (2,3) AND hierarchy_level_id = 2 THEN hd.factor
         WHEN product_selection_type = 1 THEN hsd.factor
         ELSE 1 END ,1)) else 1 end as halo_effect_factor,

CASE WHEN offer_distribution_channel = 1 THEN app_only_factor
WHEN customer_type = 0 AND offer_distribution_channel = 0 THEN loyalty_factor ELSE 1 END
AS loyalty_factor_final


FROM final_discount fd

LEFT JOIN price_promo_opt.tb_halo_effect_sitewide_factor_opt hsd USING (s1_id)

LEFT JOIN price_promo_opt.tb_halo_effect_department_factor_opt hd USING (s1_id, l2_cid)
left JOIN price_promo_opt.tb_loyalty_app_factor_opt la USING (s1_id)



);


CREATE INDEX idx_promo_scenario_discount_filter_%s_%s
		ON price_promo_opt_temp.promo_scenario_discount_filter_%s_%s
		USING btree (l3_cid, brand_cid, s1_id);

CREATE INDEX idx_promo_scenario_discount_filter_%s_%s_product_base
		ON price_promo_opt_temp.promo_scenario_discount_filter_%s_%s
		USING btree (product_id, base_percentage);

    ', 	var_promo_id, array_to_string(arr_scenario_id, '_'),

   		var_promo_id, array_to_string(arr_scenario_id, '_'),

  		var_promo_id, array_to_string(arr_scenario_id, '_'),

 		var_promo_id, arr_scenario_id::text,

 		var_promo_id, arr_scenario_id::text,

 		arr_scenario_id::text,

 		var_promo_id



 		--index

 		,

   		var_promo_id, array_to_string(arr_scenario_id, '_'),

  		var_promo_id, array_to_string(arr_scenario_id, '_')

  		,

   		var_promo_id, array_to_string(arr_scenario_id, '_'),

  		var_promo_id, array_to_string(arr_scenario_id, '_')

 		);



    -- Print the query

    RAISE NOTICE '%', query;



    -- Execute the query

    EXECUTE query;

END;

$procedure$
;
