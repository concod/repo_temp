--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_simulation_create_gurobi_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_pre_simulation_create_gurobi_data

DROP PROCEDURE if exists price_promo_opt.pc_opt_pre_simulation_create_gurobi_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_simulation_create_gurobi_data(IN var_promo_id integer, IN arr_speed_id integer[], IN var_week_start_date date, IN var_week_end_date date, IN var_start_date date, IN var_end_date date, IN table_suffix character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE



    query varchar;



BEGIN



    query := format('

        		DROP TABLE IF EXISTS price_promo_opt_temp.promo_gurobi_data_pre_%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_gurobi_data_pre_%s AS

        WITH

        cte_1 as materialized

        (select *, date as recommendation_date from price_promo_opt_temp.promo_opt_pre_discount_filter_%s_final fd

                LEFT JOIN (

                    SELECT product_id, day_split_ratio, simulation_week_start_date, date as date, base_percentage, sales_units, baseline_sales_units, elasticity, end_cap_multiplier, reg_price_multiplier

                    FROM price_promo_opt.tb_simulation_day_opt WHERE date BETWEEN ''%s'' AND ''%s''

                ) smw USING(product_id, base_percentage, date)

                ),

                sub_q as materialized (

                        SELECT

				discount_level_value, --product_id, recommendation_date, store_reco_level,

                cost as cost,

				(current_price / (1 + COALESCE(vat_percentage, 0)/100))  * (100-effective_discount) * 0.01 AS discounted_price ,

				offer_type, offer_identifier, discount_filter,

--                sales_units as sales_units_sim,

				(sales_units
    			+ (COALESCE(end_cap_flag, 0) * COALESCE(end_cap_multiplier, 0))
    			* CASE WHEN offer_type = ''reg_price'' THEN COALESCE(reg_price_multiplier, 0) ELSE 1 END
				) AS sales_units_sim,

				baseline_sales_units as

				baseline_sales_units_sim,

				--coalesce(day_split_ratio, 0)as day_split_unmod,

                1 AS store_split_factor,

                1 as product_split_ratio,

                (1+(coalesce(elasticity,0) * (effective_discount - base_percentage) / 100)) AS elasticity_factor,

--				loyalty_factor_final,

                0 AS pf_coefficient,

                0 AS cb_coefficient,

--				halo_effect_factor,
effective_discount_old,product_id,discount_constraint_hierachy, 

				scan_back_per_product,

				off_invoice_per_product

                FROM cte_1



--                LEFT JOIN (select week_start_date,l3_cid,l0_cid, store_reco_level, store_split from price_promo_opt_temp.promo_simulation_store_level_data_%s
--                            WHERE week_start_date BETWEEN ''%s'' AND ''%s'') ss
--
--                USING(week_start_date, l3_cid, l0_cid,store_reco_level)
--
--
--
--                LEFT JOIN price_promo_opt_temp.promo_simulation_pf_coefficient_stack_%s
--
--                USING( product_id,store_reco_level,s1_id,s0_id, effective_discount)



--                LEFT JOIN (
--
--                    SELECT
--
--                    l3_cid, week_start_date, date AS recommendation_date,
--
--                    sum(day_split_ratio) day_split_ratio
--
--                    FROM price_promo_opt.tb_day_split_opt
--
--                    WHERE date BETWEEN ''%s'' AND ''%s''
--
--                    group by l3_cid, week_start_date, date
--
--                ) ds USING(l3_cid, week_start_date, recommendation_date)



--                LEFT JOIN (select offer_identifier, promo_week as week_start_date, l3_cid, l0_cid, s1_id,s0_id,
--
--                        avg(cb_coefficient) cb_coefficient
--
--                        from price_promo_opt_temp.promo_simulation_cannibalization_coefficient_stack_%s
--
--                        group by offer_identifier, promo_week, l3_cid, l0_cid, s1_id, s0_id )cnf
--
--                        USING( offer_identifier, week_start_date, l3_cid, l0_cid, s1_id, s0_id)
					LEFT JOIN (select 
--l0_id ::integer 
l0_cid, vat_percentage*100::integer as vat_percentage from  global.tb_vat_master) vm using(l0_cid)
--


                ),

        subquery_calc AS materialized (

            SELECT

               discount_constraint_hierachy, discount_level_value, offer_type, offer_identifier, discount_filter, discounted_price, cost ,

                (elasticity_factor * store_split_factor * 
--loyalty_factor_final * halo_effect_factor *
sales_units_sim) as sales_units_store_day,

                ( store_split_factor * 
--loyalty_factor_final * 
baseline_sales_units_sim) as baseline_sales_units,

                coalesce(store_split_factor * 
--loyalty_factor_final * 
pf_coefficient * product_split_ratio,0) as pull_forward_units,

                coalesce((store_split_factor * 
--loyalty_factor_final * 
cb_coefficient * product_split_ratio),0) AS cannibalization_units,product_id,effective_discount_old, 
				scan_back_per_product,

				off_invoice_per_product

                    FROM sub_q)





     	select coalesce(discount_constraint_hierachy, ''0'') discount_constraint_hierachy,

            coalesce(opt_level_bins,''-200'') opt_level_bins,

            offer_type, offer_identifier, discount_filter as offer_value,

			coalesce(sales_units,0) as sales_units,

			coalesce(revenue,0) as revenue, 

			coalesce(margin_wo_vf,0) as margin_wo_vf,

			coalesce(round((margin_wo_vf + ((scan_back_per_discount_level + off_invoice_per_discount_levl) * sales_units))::numeric,2),0) AS margin,

			sku_count, effective_percentage_discount



			from

--			(select distinct offer_type, offer_identifier, discount_filter	 from price_promo_opt.master_valid_offers
--
--							INNER join price_promo_opt.fn_get_rules_data(%s) using(offer_type)
--
--			 WHERE (discount_filter BETWEEN min_discount AND max_discount) OR
--
--			(discount_filter = any(CASE WHEN discount_type_values::integer[] is NULL THEN ARRAY[]::integer[]
--
--				ELSE discount_type_values::integer[] end))) mvo1
--
--			LEFT JOIN

        (SELECT discount_constraint_hierachy::text discount_constraint_hierachy,

            discount_level_value::text AS opt_level_bins,

			offer_type,

			offer_identifier,

			discount_filter,

			round(coalesce(sum(sales_units),0)::numeric,2) as sales_units,

			round(coalesce(sum((sales_units * discounted_price)),0)::numeric,2) as revenue,

			round(coalesce(sum((sales_units * (discounted_price - cost))),0)::numeric,2) as margin_wo_vf,

			round(coalesce(count(distinct product_id),1),0) as sku_count,

			round(coalesce(avg(effective_discount_old),0),0) as effective_percentage_discount,

			round(coalesce(sum(scan_back_per_product),0)::numeric,2) as scan_back_per_discount_level,

			round(coalesce(sum(off_invoice_per_product),0)::numeric,2) as off_invoice_per_discount_levl


        FROM (select *,

			(sales_units_store_day -

			    Least(0.15*baseline_sales_units, pull_forward_units) -

			    Least(0.15*baseline_sales_units, cannibalization_units))::float8

			        as sales_units from subquery_calc) sq1

			group by 1,2,3,4,5) final_1

			--using(offer_type, offer_identifier,discount_filter)



        ',



		-- table name

		table_suffix,table_suffix,

        -- Discount filter

        table_suffix,



        -- SMW

        var_start_date, var_end_date,

        -- SS
table_suffix,

         var_week_start_date, var_week_end_date,

        -- PF

        table_suffix,

        -- DS

       var_start_date, var_end_date,

        -- CNF

        table_suffix, var_promo_id

    );





    -- Print the query

    RAISE NOTICE '%', query;



    -- Execute the query

    EXECUTE query;





END;

$procedure$
;
