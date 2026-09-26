--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_pre_create_discount_filter

DROP PROCEDURE if exists price_promo_opt.pc_opt_pre_create_discount_filter;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_create_discount_filter(IN var_promo_id integer, IN var_speed_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    query varchar;
    temp_table_name varchar;
    join_clause varchar;
    date_columns varchar;
    index_columns varchar;
    index_name_suffix varchar;
    scenario_id_select varchar;
	-- Variables for stack flow
    table_suffix varchar;
    var_start_date date;
    var_end_date date;
    var_week_start_date date;
    var_week_end_date date;
    discount_filter_name varchar;
	discount_filter_name_2 varchar;
	discount_filter_name_3 varchar;
    arr_speed_id integer[] := ARRAY[var_speed_id]; --create array
product_level_id_tag integer ;

store_level_id_tag integer ;
BEGIN


SELECT
	count(product_level_value)
INTO
	product_level_id_tag
FROM
	price_promo.tb_promo_product_reco_details
WHERE
	promo_id = var_promo_id;

SELECT
	count(store_level_value)
INTO
	store_level_id_tag
FROM
	price_promo.tb_promo_store_reco_details
WHERE
	promo_id = var_promo_id;



    -- Determine table name and join clause based on stack_flag

        temp_table_name := format('price_promo_opt_temp.promo_opt_pre_discount_filter_%s_%s', var_promo_id, var_speed_id);
        date_columns := ', week_start_date, date';
        index_columns := 'l3_cid, brand_cid, s1_id';
        index_name_suffix := '_idx'; -- No suffix when not stacking

join_clause := format('
        CROSS JOIN
            (SELECT DISTINCT date_id AS date, week_start_date
            FROM
                (SELECT start_date, end_date FROM price_promo.promo_master WHERE promo_id = %s) pm
            INNER JOIN
                (SELECT fdmi.date_id, fdmi.weeks_start_date AS week_start_date
                 FROM global.tb_fiscal_date_mapping fdmi) fdm
            ON fdm.date_id BETWEEN pm.start_date AND pm.end_date) sub3', var_promo_id);


    -- Construct the main query
    query := format('
        DROP TABLE IF EXISTS %s;
        CREATE UNLOGGED TABLE %s AS
        (
            WITH
            disc_changes AS (
                SELECT
        promo_id::integer AS promo_id,
        NULL::date AS created_at,
        offer_type AS offer_type,
        (promo_id)::integer AS scenario_id,
        (opt_discount_type_id)::integer AS offer_type_id,
        (offer_x_value)::float AS offer_x_value,
        offer_x_type AS offer_x_type,
        (offer_y_value)::float AS offer_y_value,
        offer_y_type AS offer_y_type,
        (offer_z_value)::float AS offer_z_value,
        offer_z_type AS offer_z_type,
        NULL::integer AS tier_id,
		--l0_cid,l1_cid,l2_cid,l3_cid,l4_cid,brand_cid,
		s0_id, s1_id, concat(s0_id, ''_'', s1_id) as store_hierarchy,
        concat(coalesce(product_level_id,0), ''_'', coalesce(store_level_id,0), ''_'', coalesce(customer_level_id,0)) AS discount_level_value,
        NULL::varchar offer_type_combined_display_name,
        COALESCE(product_id,0)::integer as product_id,
		COALESCE(customer_id,0)::integer as  customer_id,
		offer_identifier,discount_filter
				
    FROM
        (
            SELECT distinct
                promo_id,
                COALESCE(dlp.product_id, pdm.product_id) product_id,
                product_level_id,
                store_level_id,customer_id, customer_level_id,
				s0_id, s1_id
            FROM
				(select promo_id, product_level_id, store_level_id, customer_level_id from price_promo.ps_scenario_discounts where
promo_id = %s ) sb1

			LEFT JOIN
                price_promo.tb_promo_product_reco_details pprd USING (promo_id, product_level_id)
            LEFT JOIN
                price_promo.tb_promo_store_reco_details psrd USING (promo_id, store_level_id)
         	LEFT JOIN
                price_promo.tb_promo_customer_reco_details pcrd USING (promo_id, customer_level_id)
            LEFT JOIN
                price_promo.tb_discount_level_stores dls USING (store_level_id)
            LEFT JOIN
                price_promo.tb_discount_level_products dlp USING (product_level_id)
            LEFT JOIN
                price_promo.tb_discount_level_customers dlc USING (customer_level_id) 


			%s
 			JOIN (SELECT sm.* FROM price_promo.fn_fetch_stores_for_promo(%s) ss
			LEFT join global.tb_store_master sm using(store_id)) stm 

%s

			%s
			JOIN (SELECT pm.* FROM price_promo.promo_product_%s pp
			LEFT JOIN price_promo.product_master pm using(product_id)) pdm 

%s
			LEFT JOIN price_promo.promo_master using(promo_id)

            WHERE
                promo_id = %s
        ) tabl

Left JOIN
               (select *, 1 as tiered_offer_indicator, 1 as max_tier  from price_promo.master_valid_offers

							Inner join price_promo_opt.fn_get_rules_data(%s) using(offer_type)

			 WHERE (discount_filter BETWEEN min_discount AND max_discount) OR

			(discount_filter = any(CASE WHEN discount_type_values::integer[] is NULL THEN ARRAY[]::integer[]

				ELSE discount_type_values::integer[] end))

			) psd using(promo_id)
            ),
            opt_offer AS materialized (    SELECT
        *,
        LEAST(
            GREATEST(
                CASE
                    WHEN offer_type = ''percent_off'' OR offer_type =''upto_x_percent_off'' THEN offer_x_value
                    WHEN offer_type = ''extra_amount_off'' THEN ((offer_x_value / current_price) * 100)
                    WHEN offer_type = ''fixed_price'' THEN (((current_price - offer_x_value) / current_price) * 100)
                    WHEN offer_type = ''bxgy_percent_off'' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100
                    WHEN offer_type = ''bxgy'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off'' THEN offer_y_value
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off'' THEN offer_y_value
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / offer_x_value) * 100)
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / (offer_x_value * current_price)) * 100)
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar'' THEN (((current_price - (offer_y_value / offer_x_value)) / current_price) * 100)
                END,
                0
            ),
            100
        ) AS calculated_discount,

        LEAST(
            GREATEST(
                CASE
                    WHEN offer_type = ''percent_off'' OR offer_type =''upto_x_percent_off'' THEN offer_x_value
                    WHEN offer_type = ''extra_amount_off'' THEN ((offer_x_value / avg_current_price) * 100)
                    WHEN offer_type = ''fixed_price'' THEN (((avg_current_price - offer_x_value) / avg_current_price) * 100)
                    WHEN offer_type = ''bxgy_percent_off'' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100
                    WHEN offer_type = ''bxgy'' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off'' THEN offer_y_value
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off'' THEN offer_y_value
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / offer_x_value) * 100)
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off'' THEN ((offer_y_value / (offer_x_value * avg_current_price)) * 100)
                    WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar'' THEN (((avg_current_price - (offer_y_value / offer_x_value)) / avg_current_price) * 100)
                END * 0.01,
                0
            ),
            1
        ) AS temp_discount,

        (
            CASE
                WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' THEN offer_x_value / avg_current_price
                WHEN offer_type IN (''bmsm'', ''bxgy'', ''bxgy_percent_off'') AND offer_x_type = ''unit'' THEN offer_x_value
            END
        ) - 1 AS exp_qty--, discount_constraint_hierachy, product_discount_level_id --,store_id, 
    FROM
        (
            SELECT
                promo_id,
                product_id,
				l0_cid, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid,
                msrp,
                current_price,
                avg_current_price,
                offer_distribution_channel,
                customer_type,
                product_selection_type,
                hierarchy_level_id,
                cost,
                ecom_shipping_cost,
                promo_duration, case when product_discount_level_id =2 then l2_cid else 0 end as discount_constraint_hierachy, product_discount_level_id

            FROM
                price_promo_opt_temp.promo_product_filter_resim_%s_%s pf
        ) sub1
    LEFT JOIN (
        SELECT
            psd.promo_id AS promo_id,product_id,store_hierarchy,customer_id,
			s0_id, s1_id,
            scenario_id, discount_level_value AS discount_level_value,
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
            COALESCE(tpsd.max_tier, 1) AS max_tier,
            COALESCE(tpsd.tiered_offer_indicator, 0) AS tiered_offer_indicator,
            created_at,offer_identifier,discount_filter
        FROM
            disc_changes psd
        LEFT JOIN
            price_promo_opt.fn_simulation_tiered_offer_calculation(ARRAY[%s]) tpsd USING (tier_id)
    ) sub2 USING (promo_id, product_id)
),
            final_discount AS (
                SELECT
                    oo.promo_id,
                    oo.scenario_id,
                    oo.discount_level_value,
                    oo.product_id,oo.store_hierarchy,oo.customer_id,
                        l0_cid, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid,
                        oo.s0_id, oo.s1_id,
                    oo.current_price,
                    msrp,
                    oo.cost,
                    ecom_shipping_cost,
                    promo_duration,
                    oo.offer_type_id,
                    oo.offer_type,
                    offer_x_value,
                    oo.offer_x_type,
                    offer_y_value,
                    oo.offer_y_type,
                    offer_z_value,
                    oo.offer_z_type,
                    oo.tier_id,
                    oo.offer_type_combined_display_name,
                    calculated_discount,
                    COALESCE(
                        CASE
                            WHEN exp_qty > 0 THEN
                                GREATEST(0.3, LEAST(0.98, POWER(0.85, (exp_qty - (LEAST(ROUND((ceil(temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * temp_discount)))))
                            ELSE 1
                        END,
                        1
                    ) AS penetration_factor,
                    offer_distribution_channel,
                    customer_type,
                    product_selection_type,
                    hierarchy_level_id,
                    created_at,offer_identifier,discount_filter, discount_constraint_hierachy, product_discount_level_id
                FROM
                    opt_offer oo
            )
            SELECT
                promo_id,
                scenario_id,
                discount_level_value,
                product_id, store_hierarchy, customer_id,
                l0_cid, l1_cid, l2_cid, l3_cid, l4_cid, brand_cid,
                s0_id, s1_id,  
                current_price,
                msrp,
                cost,
                ecom_shipping_cost,
                promo_duration,
                created_at,
                offer_type_id,
                offer_type,
                ROUND(calculated_discount::numeric, 2) AS calculated_discount,
                penetration_factor,
                ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) AS effective_discount,
                offer_distribution_channel,
                customer_type,
                product_selection_type,
                hierarchy_level_id,
                CASE
                    WHEN COALESCE(calculated_discount * penetration_factor, 0) >= 95 THEN 95
                    ELSE FLOOR(COALESCE(calculated_discount * penetration_factor, 0) / 5) * 5 + CASE WHEN COALESCE(calculated_discount * penetration_factor, 0)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END
                END::integer AS base_percentage,
                offer_identifier,discount_filter,
                CASE
                    WHEN COALESCE(calculated_discount * penetration_factor, 0) >= 10 THEN (
                        COALESCE(
                            CASE
                                WHEN product_selection_type IN (2, 3) AND hierarchy_level_id = 2 THEN hd.factor
                                WHEN product_selection_type = 1 THEN hsd.factor
                                ELSE 1
                            END,
                            1
                        )
                    )
                    ELSE 1
                END AS halo_effect_factor,
                CASE
                    WHEN offer_distribution_channel = 1 THEN app_only_factor
                    WHEN customer_type = 0 AND offer_distribution_channel = 0 THEN loyalty_factor
                    ELSE 1
                END AS loyalty_factor_final
                %s  -- Date columns (or empty if not stacking)
			, discount_constraint_hierachy, product_discount_level_id
            FROM
                final_discount fd
            LEFT JOIN
                price_promo_opt.tb_halo_effect_sitewide_factor_opt hsd USING (s1_id)
            LEFT JOIN
                price_promo_opt.tb_halo_effect_department_factor_opt hd USING (s1_id, l2_cid)
            LEFT JOIN
                price_promo_opt.tb_loyalty_app_factor_opt la USING (s1_id)
            %s  --cross join (or empty if not stacking)
        );

        CREATE INDEX %s%s
                ON %s
                USING btree (%s);

        CREATE INDEX %s%s_product_base
                ON %s
                USING btree (product_id, base_percentage %s);

',
    temp_table_name, temp_table_name,  -- Table name (DROP and CREATE)
   	var_promo_id,
CASE
	WHEN store_level_id_tag = 0 THEN 
		'CROSS'
	ELSE 'LEFT'
END,

var_promo_id,
CASE
	WHEN store_level_id_tag = 0 THEN 
		''
	ELSE ' USING(store_id) '
END,

CASE
	WHEN product_level_id_tag = 0 THEN 
		'CROSS'
	ELSE 'LEFT'
END,

var_promo_id,

CASE
	WHEN product_level_id_tag = 0 THEN 
		''
	ELSE ' USING(product_id) '
END,

    var_promo_id,
var_promo_id,
    var_promo_id, var_speed_id,  -- For promo_product_filter table name
    var_speed_id, --for tiered offer function
    date_columns,  -- date columns
    join_clause,  -- Cross join (or empty) for date stacking
    split_part(temp_table_name, '.', 2),index_name_suffix,temp_table_name,index_columns,
    split_part(temp_table_name, '.', 2),index_name_suffix,temp_table_name,
	''
);

    -- Print the query (for debugging)
    RAISE NOTICE '%', query;

    -- Execute the query
    EXECUTE query;
	CALL price_promo_opt.pc_opt_pre_create_discount_filter_finalized_stack(var_promo_id, array[var_speed_id]);
	CALL price_promo_opt.pre_generate_promo_scenario_report_stack(temp_table_name, format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s',var_promo_id, var_speed_id));



END;
$procedure$



;