--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_update_promo_override_forecast_using_multiplier_method_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_update_promo_override_forecast_using_multiplier_method_stack

DROP FUNCTION if exists price_promo_opt.fn_update_promo_override_forecast_using_multiplier_method_stack;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_update_promo_override_forecast_using_multiplier_method_stack(p_promo_id integer, arr_scenario_id integer[], table_key text, p_user_id integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE

    _query text;

	_source_table text;

    _sales_units_multiplier float8;

    _baseline_sales_units_multiplier float8;

    _override_table text;

    _override_agg_table text;

	_multiplier_table_table text;

 	p_scenario_id integer;

BEGIN

	p_scenario_id := arr_scenario_id[1];

 IF p_scenario_id = 0 THEN

CALL price_promo_opt.pc_opt_get_multiplier_override_stack(p_promo_id, ARRAY[p_scenario_id]::int[]);

	_multiplier_table_table := format('price_promo_opt_temp.opt_stacked_multiplier_table_%s_%s',p_promo_id, p_scenario_id);

ELSE

	CALL price_promo_opt.pc_simulation_get_multiplier_override_stack(p_promo_id, ARRAY[p_scenario_id]::int[]);

	_multiplier_table_table := format('price_promo_opt_temp.simulation_stacked_multiplier_table_%s_%s',p_promo_id, p_scenario_id);

END IF;



    _sales_units_multiplier = 1;

    _baseline_sales_units_multiplier = 1;



    IF p_scenario_id = 0 THEN

	    IF table_key = 'stack' THEN

	        _source_table := 'price_promo.ps_recommended_stack_ia';

	        _override_table := 'price_promo.ps_recommended_stack_override_ia';

	        _override_agg_table := 'price_promo.ps_recommended_stack_override_ia_agg';

	    ELSE

	        _source_table := 'price_promo.ps_recommended_ia_projected';

	        _override_table := 'price_promo.ps_recommended_override_ia';

	        _override_agg_table := 'price_promo.ps_recommended_override_ia_agg';

	    END IF;

ELSE

    IF table_key = 'stack' THEN

        _source_table := 'price_promo.ps_recommended_scenarios_stack';

        _override_table := 'price_promo.ps_recommended_scenarios_stack_override';

        _override_agg_table := 'price_promo.ps_recommended_scenarios_stack_override_agg';

    ELSE

        _source_table := 'price_promo.ps_recommended_scenarios';

        _override_table := 'price_promo.ps_recommended_override';

        _override_agg_table := 'price_promo.ps_recommended_override_agg';

    END IF;

END IF;







    _query = format('

        delete from %2$s

        where promo_id = %1$s %4$s;

        delete from %3$s

        where promo_id = %1$s %4$s;

    ',

    p_promo_id,

    _override_table,

    _override_agg_table,

    case when p_scenario_id !=0 then format('and scenario_id = %1$s',p_scenario_id) else '' end



    );

	execute _query;



    raise notice '_source_table: %', _source_table;



    _query = format('

        insert into %7$s

        (

            event_id,promo_id,

            %8$s

            product_id,recommendation_date,s0_id,

            s1_id,discount_level_value,offer_type_id,



            effective_discount,original_cost,

            discounted_price,

            promo_spend,

            sales_units,

            baseline_sales_units,

            incremental_sales_units,



            revenue,

            baseline_revenue,

            incremental_revenue,



            margin,

            baseline_margin,

            incremental_margin,



            affinity_units,

            cannibalization_units,

            pull_forward_units,

            affinity_revenue,

            cannibalization_revenue,

            pull_forward_revenue,

            affinity_margin,

            cannibalization_margin,

            pull_forward_margin,

            calculated_discount,



            created_by,

            updated_by,

            created_at,



            updated_at,

            contribution_revenue,

            contribution_margin,

			offer_type_combined_display_name

        )

        select

            event_id,promo_id,

            %8$s

            product_id,recommendation_date,s0_id,

            s1_id,discount_level_value,offer_type_id,



            effective_discount,original_cost,

            discounted_price,

            promo_spend*coalesce(sales_units_multiplier, %3$s) as promo_spend,

            sales_units*coalesce(sales_units_multiplier, %3$s) as sales_units,

            baseline_sales_units*coalesce(baseline_sales_units_multiplier, %3$s) baseline_sales_units,

            (sales_units*coalesce(sales_units_multiplier, %3$s))-(baseline_sales_units*coalesce(baseline_sales_units_multiplier, %3$s)) as incremental_sales_units,

           revenue*coalesce(sales_units_multiplier, %3$s) as revenue,

            baseline_revenue*coalesce(baseline_sales_units_multiplier, %3$s) as baseline_revenue,

            (revenue*coalesce(sales_units_multiplier, %3$s)) - (baseline_revenue*coalesce(baseline_sales_units_multiplier, %3$s)) as incremental_revenue,

  margin*coalesce(sales_units_multiplier, %3$s) as margin,

            baseline_margin*coalesce(baseline_sales_units_multiplier, %3$s) as baseline_margin,

            (margin*coalesce(sales_units_multiplier, %3$s)) - (baseline_margin*coalesce(baseline_sales_units_multiplier, %3$s)) as incremental_margin,



            affinity_units*coalesce(sales_units_multiplier, %3$s) as affinity_units,

            cannibalization_units*coalesce(sales_units_multiplier, %3$s) as cannibalization_units,

            pull_forward_units*coalesce(sales_units_multiplier, %3$s) as pull_forward_units,

            affinity_revenue*coalesce(sales_units_multiplier, %3$s) as affinity_revenue,

            cannibalization_revenue*coalesce(sales_units_multiplier, %3$s) as cannibalization_revenue,

            pull_forward_revenue*coalesce(sales_units_multiplier, %3$s) as pull_forward_revenue,

            affinity_margin*coalesce(sales_units_multiplier, %3$s) as affinity_margin,

            cannibalization_margin*coalesce(sales_units_multiplier, %3$s) as cannibalization_margin,

            pull_forward_margin*coalesce(sales_units_multiplier, %3$s) as pull_forward_margin,

            calculated_discount,





            %6$s as created_by,

            null as updated_by,

            now() as created_at,



            null as updated_at,

            contribution_revenue*coalesce(sales_units_multiplier, %3$s) as contribution_revenue,

            contribution_margin*coalesce(sales_units_multiplier, %3$s) as contribution_margin,

			offer_type_combined_display_name

        from

            %5$s

		LEFT JOIN %10$s

		using(product_id, s0_id, s1_id, recommendation_date)

        where promo_id = %1$s

        %9$s

        ',

    p_promo_id,

    p_scenario_id,

    _sales_units_multiplier,

    _baseline_sales_units_multiplier,

    _source_table,

    coalesce(p_user_id,0),

    _override_table,

    case when p_scenario_id !=0 then 'scenario_id,' else '' end,

    case when p_scenario_id !=0 then format('and scenario_id = %1$s',p_scenario_id) else '' end,

	_multiplier_table_table

    );





    raise notice 'query: %', _query;

    execute _query;





    IF p_scenario_id = 0 THEN



        -- Query for scenario 0 aggregation

        _query := format('

            INSERT INTO %s (

                event_id,

                promo_id,

                recommendation_date,

                discount_level_value,

                OFFER_TYPE_COMBINED_DISPLAY_NAME,

                effective_discount,



                original_cost,

                discounted_price,

                promo_spend,



                sales_units,

                baseline_sales_units,

                incremental_sales_units,



                revenue,

                baseline_revenue,

                incremental_revenue,



                margin,

                baseline_margin,

                incremental_margin,



				aur, aum,





                affinity_revenue,

                cannibalization_revenue,

                pull_forward_revenue,

                affinity_margin,

                cannibalization_margin,

                pull_forward_margin,

                contribution_margin,

                contribution_revenue,

                RECOMMENDATION_TYPE_ID,

                created_by,

                updated_by,

                created_at,

                updated_at

            )

            SELECT

                event_id,

                promo_id,

                recommendation_date,

                MAX(discount_level_value),

                OFFER_TYPE_COMBINED_DISPLAY_NAME,

                AVG(effective_discount),



                AVG(original_cost),

                AVG(discounted_price),

                SUM(promo_spend),



                SUM(sales_units),

                SUM(baseline_sales_units),

                SUM(incremental_sales_units),



                SUM(revenue),

                SUM(baseline_revenue),

                SUM(incremental_revenue),



                SUM(margin),

                SUM(baseline_margin),

                SUM(incremental_margin),





			coalesce(sum(revenue) / nullif(sum(sales_units), 0), 0) AS aur,

			coalesce(sum(margin) / nullif(sum(sales_units), 0), 0) AS aum,



                SUM(affinity_revenue),

                SUM(cannibalization_revenue),

                SUM(pull_forward_revenue),

                SUM(affinity_margin),

                SUM(cannibalization_margin),

                SUM(pull_forward_margin),

                SUM(contribution_margin),

                SUM(contribution_revenue),

                1 AS RECOMMENDATION_TYPE_ID,

                MAX(created_by),

                MAX(updated_by),

                MAX(created_at),

                MAX(updated_at)

            FROM %s

            WHERE promo_id = $1

            GROUP BY event_id, promo_id, recommendation_date;',

            _override_agg_table, _override_table);



        -- Execute the query for scenario 0

        EXECUTE _query USING p_promo_id;



    ELSE



        -- Query for other scenarios with different level aggregation

        _query := format('

            INSERT INTO %s (

                event_id,

                promo_id,

                scenario_id,

                recommendation_date,

                discount_level_value,

                OFFER_TYPE_COMBINED_DISPLAY_NAME,

                effective_discount,



                original_cost,

                discounted_price,

                promo_spend,

                sales_units,

                baseline_sales_units,

                incremental_sales_units,



                revenue,

                baseline_revenue,

                incremental_revenue,



                margin,

                baseline_margin,

                incremental_margin,



                aur,

                aum,

                affinity_revenue,

                cannibalization_revenue,

                pull_forward_revenue,

                affinity_margin,

                cannibalization_margin,

                pull_forward_margin,

                contribution_margin,

                contribution_revenue,

                RECOMMENDATION_TYPE_ID,

                created_by,

                updated_by,

                created_at,

                updated_at,

                offer_type_id

            )

            SELECT

                event_id,

                promo_id,

                scenario_id,

                recommendation_date,

                discount_level_value,

--                CASE
--
--                    WHEN offer_type_scenario = ''tiered_offer'' THEN concat(effective_discount::int, '' %%'')
--
--                    ELSE 

				OFFER_TYPE_COMBINED_DISPLAY_NAME,

--                END,

                effective_discount,



                original_cost,

                discounted_price,

                promo_spend,

                sales_units,

                baseline_sales_units,

                incremental_sales_units,

                revenue,

                baseline_revenue,

                incremental_revenue,



                margin,

                baseline_margin,

                incremental_margin,



                aur,

                aum,

                affinity_revenue,

                cannibalization_revenue,

                pull_forward_revenue,

                affinity_margin,

                cannibalization_margin,

                pull_forward_margin,

                contribution_margin,

                contribution_revenue,

                RECOMMENDATION_TYPE_ID,

                created_by,

                updated_by,

                created_at,

                now()::timestamptz AS updated_at,

                offer_type_id offer_type_id

            FROM (

                SELECT

                   event_id,

            promo_id,scenario_id,

            recommendation_date,

            MAX(discount_level_value) AS discount_level_value,

--            NULL AS OFFER_TYPE_COMBINED_DISPLAY_NAME,

			MAX(OFFER_TYPE_COMBINED_DISPLAY_NAME) AS OFFER_TYPE_COMBINED_DISPLAY_NAME,

            AVG(effective_discount) AS effective_discount,



            AVG(original_cost) AS original_cost,

            AVG(discounted_price) AS discounted_price,

            SUM(promo_spend) AS promo_spend,

            SUM(sales_units) AS sales_units,

            SUM(baseline_sales_units) AS baseline_sales_units,

            SUM(incremental_sales_units) AS incremental_sales_units,

            SUM(revenue) AS revenue,

            SUM(baseline_revenue) AS baseline_revenue,

            SUM(incremental_revenue) AS incremental_revenue,



            SUM(margin) AS margin,

            SUM(baseline_margin) AS baseline_margin,

            SUM(incremental_margin) AS incremental_margin,





			coalesce(sum(revenue) / nullif(sum(sales_units), 0), 0) AS aur,

			coalesce(sum(margin) / nullif(sum(sales_units), 0), 0) AS aum,



            SUM(affinity_revenue) AS affinity_revenue,

            SUM(cannibalization_revenue) AS cannibalization_revenue,

            SUM(pull_forward_revenue) AS pull_forward_revenue,

            SUM(affinity_margin) AS affinity_margin,

            SUM(cannibalization_margin) AS cannibalization_margin,

            SUM(pull_forward_margin) AS pull_forward_margin,

            sum(contribution_margin) as contribution_margin,

            sum(contribution_revenue) as contribution_revenue,

            1 AS RECOMMENDATION_TYPE_ID,

            MAX(created_by) AS created_by,

            MAX(updated_by) AS updated_by,

            MAX(created_at) AS created_at,

            MAX(updated_at) AS updated_at,

			max(offer_type_id) offer_type_id

                FROM %s

                WHERE scenario_id = $1

            group by 1,2,3,4) s

            CROSS JOIN (

                SELECT DISTINCT offer_type AS offer_type_scenario

                FROM price_promo.ps_scenario_discounts

                WHERE scenario_id = $1

            ) b

;',

            _override_agg_table, _override_table);

		raise notice '%s',_query;

        -- Execute the query for other scenarios

        EXECUTE _query USING p_scenario_id;



    END IF;

	execute format('DROP table if exists %s',_multiplier_table_table);



END

$function$
;

