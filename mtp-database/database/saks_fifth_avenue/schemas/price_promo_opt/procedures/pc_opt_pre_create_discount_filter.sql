
--liquibase formatted sql
--changeset vaibhav@:pc_opt_pre_create_discount_filter_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_pre_create_discount_filter

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_pre_create_discount_filter ;    
     
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_create_discount_filter(IN var_promo_id integer, IN arr_speed_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    query TEXT;

   	table_suffix TEXT;

BEGIN

	table_suffix := format('%s_%s', var_promo_id, array_to_string(arr_speed_id, '_'));





    -- Construct the query

    query := format('

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_opt_pre_discount_filter_%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_opt_pre_discount_filter_%s AS



( select * , calculated_discount*penetration_factor as effective_discount,
    case when calculated_discount*penetration_factor >= 10
        then halo_effect_factor_initial else 1 end as halo_effect_factor,

			CASE

				WHEN calculated_discount*penetration_factor >= 95 THEN 95

				ELSE FLOOR(calculated_discount*penetration_factor / 5) * 5 +

					CASE WHEN (calculated_discount*penetration_factor)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END

				END::integer AS base_percentage

		from

        ( SELECT

			promo_id, promo_id AS scenario_id,

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

			    END AS discount_level_value

			, l2_cid, l3_cid, brand_cid,

			product_id, current_price, cost,msrp, ecom_shipping_cost, s1_id, promo_duration, discount_level,

			opt_discount_type_id AS offer_type_id, offer_type,
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

END ,0),100)AS calculated_discount,


COALESCE(

    CASE
        WHEN (CASE
        WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' THEN offer_x_value/avg_current_price
        WHEN offer_type in (''bmsm'', ''bxgy'', ''bxgy_percent_off'') AND offer_x_type = ''unit'' THEN offer_x_value
    END)-1 > 0
    THEN
GREATEST(0.3, LEAST(0.98, POWER(0.85, ((
    CASE
    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' THEN offer_x_value/avg_current_price
    WHEN offer_type in (''bmsm'', ''bxgy'', ''bxgy_percent_off'') AND offer_x_type = ''unit'' THEN offer_x_value
    END)-1 - (LEAST(ROUND((ceil(Least(greatest(
    CASE
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
END*0.01,0),1) * 10*1000)/1000.0)::numeric,2), 3) *

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
END*0.01,0),1))))))
        ELSE 1
    END,
1) AS penetration_factor

, offer_identifier,



coalesce(CASE WHEN product_selection_type IN (2,3) AND hierarchy_level_id = 2 THEN hd.factor

 WHEN product_selection_type = 1 THEN hsd.factor

 ELSE 1 END ,1)

 AS halo_effect_factor_initial,

			discount_filter,



			CASE WHEN offer_distribution_channel = 1 THEN app_only_factor

                     WHEN customer_type = 0 AND offer_distribution_channel = 0 THEN loyalty_factor ELSE 1 END

                     AS loyalty_factor_final



			FROM price_promo_opt_temp.promo_product_filter_resim_%s pf



			Inner JOIN



			(select *, 1 as tiered_offer_indicator, 1 as max_tier  from price_promo.master_valid_offers

							Inner join price_promo_opt.fn_get_rules_data(%s) using(offer_type)

			 WHERE (discount_filter BETWEEN min_discount AND max_discount) OR

			(discount_filter = any(CASE WHEN discount_type_values::integer[] is NULL THEN ARRAY[]::integer[]

				ELSE discount_type_values::integer[] end))

			) rot using(promo_id)



			CROSS JOIN (

					SELECT DISTINCT s1_id FROM price_promo.fn_fetch_stores_for_promo(%s)

					inner join (select store_id, s1_id from global.tb_store_master) smi

				using(store_id)) ss

			LEFT JOIN price_promo_opt.tb_offer_penetration_opt op

			using(offer_type, offer_x_value, offer_x_type, offer_y_value, offer_y_type, offer_z_value, max_tier, tiered_offer_indicator, s1_id)

			LEFT JOIN price_promo_opt.tb_offer_type_penetration_opt otp

			using(offer_type, offer_x_type, offer_y_type, tiered_offer_indicator, s1_id)

			LEFT JOIN price_promo_opt.tb_halo_effect_sitewide_factor_opt hsd USING (s1_id)

			LEFT JOIN price_promo_opt.tb_halo_effect_department_factor_opt hd USING (s1_id, l2_cid)

			left JOIN price_promo_opt.tb_loyalty_app_factor_opt la USING (s1_id)

)subtable);

CREATE INDEX opt_simulation_1_discount_filter_%s
		ON price_promo_opt_temp.promo_opt_pre_discount_filter_%s
		USING btree (l3_cid, brand_cid, s1_id);

CREATE INDEX opt_simulation_1_discount_filter_%s_l2
		ON price_promo_opt_temp.promo_opt_pre_discount_filter_%s
		USING btree (product_id, base_percentage);

    ', 	table_suffix, table_suffix, table_suffix,
  		var_promo_id,
  		var_promo_id
  		, table_suffix, table_suffix, table_suffix, table_suffix);

    -- Print the query

    RAISE NOTICE '%', query;

    -- Execute the query

    EXECUTE query;

END;

$procedure$
;
