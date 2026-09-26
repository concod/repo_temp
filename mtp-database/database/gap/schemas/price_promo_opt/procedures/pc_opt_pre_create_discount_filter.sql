--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_create_discount_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_pre_create_discount_filter

DROP PROCEDURE if exists price_promo_opt.pc_opt_pre_create_discount_filter;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_create_discount_filter(IN var_promo_id integer, IN var_speed_id integer, IN acceptable_price_flag boolean)
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

    -- presence tags
    product_level_id_tag integer;
    store_level_id_tag integer;
    customer_level_id_tag integer;
BEGIN
    -- Count presence of product/store/customer reco levels
    SELECT count(product_level_value)
    INTO product_level_id_tag
    FROM price_promo.tb_promo_product_reco_details
    WHERE promo_id = var_promo_id;

    SELECT count(store_level_value)
    INTO store_level_id_tag
    FROM price_promo.tb_promo_store_reco_details
    WHERE promo_id = var_promo_id;

    SELECT count(customer_level_value)
    INTO customer_level_id_tag
    FROM price_promo.tb_promo_customer_reco_details
    WHERE promo_id = var_promo_id;

    -- Temp table name
    temp_table_name := format('price_promo_opt_temp.promo_opt_pre_discount_filter_%s_%s',
                              var_promo_id, var_speed_id);

    date_columns := ', week_start_date, date';
    index_columns := 'product_id';
    index_name_suffix := '_idx';

    -- Use simulation week start date for stacking
    join_clause := format('
        CROSS JOIN (
            SELECT DISTINCT fdmi.date_id AS date, fdmi.simulation_week_start_date AS week_start_date
            FROM (
                SELECT start_date, end_date
                FROM price_promo.promo_master
                WHERE promo_id = %s
            ) pm
            INNER JOIN global.tb_fiscal_date_mapping fdmi
                ON fdmi.date_id BETWEEN pm.start_date AND pm.end_date
        ) sub3', var_promo_id);

    -- Build query
    query := format($fmt$

        DROP TABLE IF EXISTS %s;
        CREATE UNLOGGED TABLE %s AS
        (
            WITH disc_changes AS (
                SELECT
                    promo_id::integer AS promo_id,
                    NULL::date AS created_at,
                    COALESCE(psd.offer_type, psd_price.offer_type) AS offer_type,
                    promo_id::integer AS scenario_id,
                    COALESCE(psd.opt_discount_type_id, psd_price.opt_discount_type_id) AS offer_type_id,
                    COALESCE(psd.offer_x_value, psd_price.offer_x_value) AS offer_x_value,
                    offer_x_type,
                    (offer_y_value)::float AS offer_y_value,
                    offer_y_type,
                    (offer_z_value)::float AS offer_z_value,
                    offer_z_type,
                    NULL::integer AS tier_id,
                    l0_id,


                    sr.store_reco_level,
                    cr.customer_reco_level,
					sr.s0_id,

                    CONCAT(COALESCE(product_level_id,0),'_',COALESCE(store_level_id,0),'_',COALESCE(customer_level_id,0)) AS discount_level_value,
                    NULL::varchar AS offer_type_combined_display_name,
                    COALESCE(product_id,0)::integer AS product_id,new_product_flag,
                    COALESCE(psd.offer_identifier, psd_price.offer_identifier) AS offer_identifier,
                    COALESCE(psd.discount_filter, psd_price.discount_filter) AS discount_filter,
                    scan_back, off_invoice,
                    (tab1.user_metadata->>'endcap_flag')::integer AS end_cap_flag
--                FROM (
--                    -- Product + scenario fragment
--                    SELECT DISTINCT
--                        promo_id,
--                        pdm.currency_id,
--                        l0_id,
--                        COALESCE(dlp.product_id, pdm.product_id) AS product_id,
--                        product_level_id,
--                        store_level_id,
--                        customer_level_id,
--                        scan_back,
--                        off_invoice,
--                        pdm.user_metadata
                  
	    FROM

	        (

				select distinct promo_id, coalesce(dls.product_id, ss.product_id) as product_id, 
						product_level_id,new_product_flag,  user_metadata,
						store_level_id, coalesce(customer_level_id,0) customer_level_id
,(scenario_data->>'scan_back_allowance_amount')::float AS scan_back,
                               (scenario_data->>'off_invoice_allowance_amount')::float AS off_invoice,
pm.currency_id,
        pm.l0_id

						from price_promo.ps_scenario_discounts ps	
		
						left join price_promo.tb_discount_level_products dls using (product_level_id)

						left join price_promo.promo_product_%s ss using (promo_id)

    LEFT JOIN price_promo.product_master pm
        ON pm.product_id = COALESCE(dls.product_id, ss.product_id)
						
						where promo_id = %s
			)tab1

                -- Store reco via SELECT DISTINCT block



		LEFT JOIN (

						select distinct store_level_id, store_reco_level, s0_id, s1_id from global.tb_store_master
							inner join
							(
								select distinct coalesce(dls.store_id, ss.store_id) as store_id, store_level_id from 
								(select promo_id, store_level_id from price_promo.ps_scenario_discounts where promo_id = %s) ps						
								left join price_promo.tb_discount_level_stores dls using (store_level_id)
								left join price_promo.fn_fetch_stores_for_promo(%s) ss using (promo_id)
							) using (store_id)	

            		  ) sr USING (store_level_id)



                -- Customer reco via SELECT DISTINCT block

			LEFT JOIN (
					     select distinct customer_level_id, customer_reco_level, c0_id from global.customer_master
							inner join
							(
								select distinct coalesce(dls.customer_id, ss.customer_id) as customer_id, coalesce(customer_level_id,0) as customer_level_id from 
								(select promo_id, customer_level_id from price_promo.ps_scenario_discounts where promo_id = %s) ps						
								left join price_promo.tb_discount_level_customers dls using (customer_level_id)
								left join price_promo.fn_fetch_customers_for_promo(%s) ss using (promo_id)
							) using (customer_id)
					 ) cr USING (customer_level_id)


                -- Non-percent offers and rules
                LEFT JOIN (
                    SELECT DISTINCT *
                    FROM price_promo_opt.master_valid_offers
                    INNER JOIN price_promo_opt.fn_get_rules_data(%s) USING (offer_type)
                    WHERE 
				(offer_type NOT IN ('upto_x_percent_off')
                OR max_product_discount_level NOT IN (8))
                AND 
				(discount_filter BETWEEN min_discount AND max_discount)
                      OR (discount_filter = ANY(
                            CASE WHEN discount_type_values::integer[] IS NULL
                                 THEN ARRAY[]::integer[]
                                 ELSE discount_type_values::integer[] END))
                ) psd USING (promo_id, currency_id)

                -- Percent price-derived offers
                LEFT JOIN (
                    SELECT *
                    FROM (
                        SELECT DISTINCT *,
                               CONCAT(offer_type,'_', COALESCE((100-(price*100/NULLIF(current_price,0))),0)::integer) AS offer_identifier,
                               COALESCE((100-(price*100/NULLIF(current_price,0))),0)::integer AS discount_filter,
                               COALESCE((100-(price*100/NULLIF(current_price,0))),0)::integer AS offer_x_value
                        FROM price_promo_opt.fn_get_rules_data(%s)
                        INNER JOIN (
                            SELECT promo_id, product_id, current_price, l0_cid, currency_id
                            FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s
                        ) filter_data USING (promo_id)
                        %s
                        WHERE (offer_type IN ('upto_x_percent_off')
                               AND max_product_discount_level IN (8))
                          AND %s
                    ) psd_price_subq
                    INNER JOIN (
                        SELECT currency_id, offer_type, offer_x_value
                        FROM price_promo_opt.master_valid_offers
                    ) msvl USING (currency_id, offer_type, offer_x_value)
                limit 0
				) psd_price USING (promo_id, product_id)
            ),

            opt_offer AS MATERIALIZED (
                SELECT
                    *,
                    LEAST(
                        GREATEST(
                            CASE
                                WHEN offer_type IN ('percent_off','upto_x_percent_off') THEN offer_x_value
                                WHEN offer_type = 'extra_amount_off' THEN COALESCE(((offer_x_value / NULLIF(current_price,0)) * 100),0)
                                WHEN offer_type = 'fixed_price' THEN COALESCE((((current_price - offer_x_value) / NULLIF(current_price,0)) * 100),0)
                                WHEN offer_type = 'bxgx_percent_off' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100
                                WHEN offer_type = 'bxgx' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'dollar' AND offer_y_type = 'percent_off' THEN offer_y_value
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'unit'   AND offer_y_type = 'percent_off' THEN offer_y_value
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'dollar' AND offer_y_type = 'dollar_off' THEN ((offer_y_value / offer_x_value) * 100)
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'unit'   AND offer_y_type = 'dollar_off' THEN COALESCE(((offer_y_value / (offer_x_value * NULLIF(current_price,0))) * 100),0)
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'unit'   AND offer_y_type = 'at_dollar'  THEN COALESCE((((current_price - (offer_y_value / offer_x_value)) / NULLIF(current_price,0)) * 100),0)
                            END,
                            0
                        ),
                        100
                    ) AS calculated_discount,
                    LEAST(
                        GREATEST(
                            CASE
                                WHEN offer_type IN ('percent_off','upto_x_percent_off') THEN offer_x_value
                                WHEN offer_type = 'extra_amount_off' THEN COALESCE(((offer_x_value / NULLIF(avg_current_price,0)) * 100),0)
                                WHEN offer_type = 'fixed_price' THEN COALESCE((((avg_current_price - offer_x_value) / NULLIF(avg_current_price,0)) * 100),0)
                                WHEN offer_type = 'bxgx_percent_off' THEN ((offer_z_value * 0.01 * offer_y_value) / (offer_y_value + offer_x_value)) * 100
                                WHEN offer_type = 'bxgx' THEN ((offer_y_value / (offer_y_value + offer_x_value)) * 100)
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'dollar' AND offer_y_type = 'percent_off' THEN offer_y_value
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'unit'   AND offer_y_type = 'percent_off' THEN offer_y_value
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'dollar' AND offer_y_type = 'dollar_off' THEN ((offer_y_value / offer_x_value) * 100)
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'unit'   AND offer_y_type = 'dollar_off' THEN COALESCE(((offer_y_value / (offer_x_value * NULLIF(avg_current_price,0))) * 100),0)
                                WHEN offer_type = 'bmsm' AND offer_x_type = 'unit'   AND offer_y_type = 'at_dollar'  THEN COALESCE((((avg_current_price - (offer_y_value / offer_x_value)) / NULLIF(avg_current_price,0)) * 100),0)
                            END * 0.01,
                            0
                        ),
                        1
                    ) AS temp_discount,
                    (
                        CASE
                            WHEN offer_type = 'bmsm' AND offer_x_type = 'dollar' THEN COALESCE(offer_x_value / NULLIF(avg_current_price,0),0)
                            WHEN offer_type IN ('bmsm','bxgx','bxgx_percent_off') AND offer_x_type = 'unit' THEN offer_x_value
                        END
                    ) - 1 AS exp_qty
                FROM (
                   		SELECT
                        promo_id,
                        product_id,
                        l0_id,
                        l0_cid,
                        l1_cid,
						l3_cid,
                        msrp,
                        current_price,
                        avg_current_price,
                        customer_type,
                        product_selection_type,
                        hierarchy_level_id,
                        cost,
                        promo_duration,
                       -- CASE WHEN product_discount_level_id = 1 THEN l1_cid ELSE 0 END 
						1 AS discount_constraint_hierachy,
                        product_discount_level_id, new_product_flag, product_discount_level, min_discount
						--s0_id
						FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s pf
						inner JOIN (
						                SELECT
											    promo_id, min_discount,
											    CASE
											        WHEN 7 = ANY(product_discount_level) THEN 7
											        ELSE NULL
											    END AS product_discount_level
											FROM price_promo.ps_rules
						
						            ) pphl USING(promo_id)
					) as sub1

--
                LEFT JOIN (
                    SELECT
                        psd.promo_id,
                        product_id,
                        store_reco_level,
						s0_id,
                        customer_reco_level,
                        scenario_id,
                        discount_level_value,
                        COALESCE(tpsd.offer_type_id, psd.offer_type_id) AS offer_type_id,
                        COALESCE(tpsd.offer_type, psd.offer_type) AS offer_type,
                        COALESCE(tpsd.offer_x_value, psd.offer_x_value) AS offer_x_value,
                        COALESCE(tpsd.offer_x_type, psd.offer_x_type) AS offer_x_type,
                        COALESCE(tpsd.offer_y_value, psd.offer_y_value) AS offer_y_value,
                        COALESCE(tpsd.offer_y_type, psd.offer_y_type) AS offer_y_type,
                        COALESCE(tpsd.offer_z_value, psd.offer_z_value) AS offer_z_value,
                        COALESCE(tpsd.offer_z_type, psd.offer_z_type) AS offer_z_type,
                        COALESCE(tpsd.tier_id, psd.tier_id) AS tier_id,
                        psd.offer_type_combined_display_name,
                        COALESCE(tpsd.max_tier,1) AS max_tier,
                        COALESCE(tpsd.tiered_offer_indicator,0) AS tiered_offer_indicator,
                        created_at,
                        offer_identifier,
                        discount_filter,
                        scan_back,
                        off_invoice,
                        psd.end_cap_flag
                    FROM disc_changes psd
                    LEFT JOIN price_promo_opt.fn_simulation_tiered_offer_calculation(ARRAY[%s]) tpsd USING (tier_id)
                ) sub2 USING (promo_id, product_id)
            ),

            final_discount AS (
                SELECT distinct
                    oo.promo_id,
                    oo.scenario_id,
                    oo.discount_level_value,
                    oo.product_id,
                    oo.store_reco_level,
                    oo.customer_reco_level,
                    oo.l0_id,
                    l0_cid,
                    l1_cid,
					l3_cid,
                    oo.current_price,
                    msrp,
                    oo.cost,
                    promo_duration,
                    oo.offer_type_id,
                    oo.offer_type,
                    oo.offer_x_value,
                    oo.offer_x_type,
                    oo.offer_y_value,
                    oo.offer_y_type,
                    oo.offer_z_value,
                    oo.offer_z_type,
                    oo.tier_id,
                    oo.offer_type_combined_display_name,
                    calculated_discount,
                    COALESCE(
                        otp.offer_pen_factor,
                        CASE
                            WHEN exp_qty > 0 THEN
                                GREATEST(0.3, LEAST(0.98, POWER(0.85, (exp_qty - (LEAST(ROUND((ceil(temp_discount * 10 * 1000) / 1000.0)::numeric, 2), 3) * temp_discount)))))
                            ELSE 1
                        END,
                        1
                    ) AS penetration_factor,
                    customer_type,
                    product_selection_type,
                    hierarchy_level_id,
                    scan_back,
                    off_invoice,
                    created_at,
					 offer_identifier,
					discount_filter,
                    discount_constraint_hierachy,
                    product_discount_level_id,
                    oo.end_cap_flag, oo.new_product_flag,
					oo.s0_id
                FROM opt_offer oo
                LEFT JOIN price_promo_opt.tb_offer_type_penetration otp
                    ON oo.offer_type = otp.offer_type
                   AND oo.offer_x_type = otp.offer_x_type
                   AND oo.offer_y_type = otp.offer_y_type
                   AND oo.offer_x_value::numeric = otp.offer_x_value::numeric
                   AND oo.offer_y_value::numeric = otp.offer_y_value::numeric
                   AND oo.offer_z_type IS NOT DISTINCT FROM otp.offer_z_type
                   AND oo.offer_z_value IS NOT DISTINCT FROM otp.offer_z_value
                   AND oo.l0_id = otp.l0_id
            )

            SELECT
                promo_id,
                scenario_id,
                discount_level_value,
                product_id,
                store_reco_level,

                customer_reco_level,
                l0_cid,
                l1_cid,
				l3_cid,
                current_price,
                msrp,
                cost,
                promo_duration,
                created_at,
                offer_type_id,
                offer_type,
                ROUND(calculated_discount::numeric, 2) AS calculated_discount,
                penetration_factor,
                ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) AS effective_discount,

				(msrp * ROUND(COALESCE(calculated_discount * penetration_factor, 0)::numeric, 2) / 100)::numeric AS discount_amount,

                customer_type,
                product_selection_type,
                hierarchy_level_id,
                CASE
                    WHEN COALESCE(calculated_discount * penetration_factor, 0) >= 95 THEN 95
                    ELSE FLOOR(COALESCE(calculated_discount * penetration_factor, 0) / 5) * 5
                         + CASE WHEN COALESCE(calculated_discount * penetration_factor, 0)::numeric %% 5 >= 2.5 THEN 5 ELSE 0 END
                END::integer AS base_percentage,
                offer_identifier,

                discount_filter

                %s,  -- date columns
                discount_constraint_hierachy,
                product_discount_level_id,
				COALESCE(s0_id,1) AS s0_id,
                (scan_back) AS scan_back_per_product,
                (off_invoice) AS off_invoice_per_product,
                fd.end_cap_flag, fd.new_product_flag
            FROM final_discount fd
            %s  -- date stacking
        );

        CREATE INDEX %s%s ON %s USING btree (%s);
        CREATE INDEX %s%s_product_base ON %s USING btree (product_id, base_percentage%s);

    $fmt$,
        -- table drop/create
        temp_table_name, temp_table_name,

        -- product + scenario fragment
        var_promo_id,         -- ps_scenario_discounts filter
        var_promo_id,         -- promo_product_ table
        var_promo_id,         -- WHERE promo_id =

        -- store reco block
        var_promo_id,

        -- customer reco block
        var_promo_id, var_promo_id,

        -- rules join (non-percent)
        var_promo_id,

        -- rules join (percent price-derived)
        var_promo_id, var_promo_id, var_speed_id,

        -- acceptable price join fragment
        CASE WHEN acceptable_price_flag THEN
--            'INNER JOIN price_promo.tb_acceptable_price_points USING(l0_cid)' -- updated
'LEFT JOIN price_promo.tb_acceptable_price_points ap ON 1=1'

        ELSE '' END,

        -- acceptable price predicate
        CASE WHEN acceptable_price_flag THEN
            'price BETWEEN current_price * (100-ceil(max_discount+3)) * 0.01
             AND current_price * (100-min_discount) * 0.01'
        ELSE '1' END,

        -- opt_offer sub1 table
        var_promo_id, var_speed_id,

        -- tiered offer calc
        var_speed_id,

        -- final select date columns and stacking
        date_columns,
        join_clause,

        -- indexes
        split_part(temp_table_name,'.',2), index_name_suffix, temp_table_name, index_columns,
        split_part(temp_table_name,'.',2), index_name_suffix, temp_table_name, ''
    );

    RAISE NOTICE '%', query;
    EXECUTE query;

    CALL price_promo_opt.pc_opt_pre_create_discount_filter_finalized_stack(var_promo_id, ARRAY[var_speed_id]);
    CALL price_promo_opt.pre_generate_promo_scenario_report_stack(
        temp_table_name,
        format('price_promo_opt_temp.simulation_stacked_discounts_table_%s_%s', var_promo_id, var_speed_id)
    );
END;
$procedure$
;

