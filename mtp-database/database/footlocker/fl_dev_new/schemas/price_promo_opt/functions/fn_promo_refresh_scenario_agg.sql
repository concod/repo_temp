--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_promo_refresh_scenario_agg runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_promo_refresh_scenario_agg

DROP FUNCTION if exists price_promo_opt.fn_promo_refresh_scenario_agg;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_promo_refresh_scenario_agg(p_promo_id integer, _scenario_id integer[], _table_type text, _table_names text[] DEFAULT NULL::text[], _start_date date DEFAULT NULL::date, _end_date date DEFAULT NULL::date)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

DECLARE

    _date_filter TEXT; 

    _delete_query text;

    _refresh_query text;

   	_table_name text;

BEGIN

    

    IF _table_names IS null and _table_type = 'scenario' THEN

        _table_names := ARRAY['ps_recommended_scenarios', 'ps_recommended_scenarios_stack', 'ps_recommended_override', 'ps_recommended_scenarios_stack_override'];

    elsif _table_names IS null and _table_type = 'ia' then

    	_table_names := ARRAY['ps_recommended_ia_projected', 'ps_recommended_stack_ia', 'ps_recommended_override_ia', 'ps_recommended_stack_override_ia'];

    END IF;



    -- Construct date_filter based on provided dates

    IF _start_date IS NOT NULL AND _end_date IS NOT NULL THEN

        _date_filter := FORMAT('AND recommendation_date BETWEEN %L AND %L', _start_date, _end_date);

    ELSIF _start_date IS NOT NULL THEN

        _date_filter := FORMAT('AND recommendation_date >= %L', _start_date);

    ELSIF _end_date IS NOT NULL THEN

        _date_filter := FORMAT('AND recommendation_date <= %L', _end_date);

    ELSE

        select start_date, end_date from price_promo.promo_master where promo_id = p_promo_id into _start_date, _end_date;

        _date_filter := FORMAT('AND recommendation_date BETWEEN %L AND %L', _start_date, _end_date);

    END IF;



    FOR _table_name IN SELECT unnest(_table_names)

    LOOP

        _delete_query = format('DELETE FROM price_promo.%s_agg

    							WHERE promo_id = %s

      							AND scenario_id = ANY(%L)

								%s;', _table_name, p_promo_id, _scenario_id, _date_filter);

	    RAISE NOTICE 'delete query for % for promo % : %', _table_name, p_promo_id, _delete_query;

        -- Logic for processing each table

	   

	   _refresh_query = FORMAT('WITH aggregated_data AS (

       INSERT

	INTO

	price_promo.%1$s_agg(

        event_id,

	promo_id, currency_id,

	scenario_id,

	recommendation_date,

	discount_level_value,

	OFFER_TYPE_COMBINED_DISPLAY_NAME ,

	effective_discount,

	original_price,

	original_cost,

	discounted_price,

	promo_spend,

	sales_units,

	baseline_sales_units,

	incremental_sales_units,

	SALES_UNITS_LIFT,

	revenue,

	baseline_revenue,

	incremental_revenue,

	revenue_lift,

	margin,

	baseline_margin,

	incremental_margin,

	margin_lift,

	aur,

	aum,

	affinity_revenue,

	cannibalization_revenue,

	pull_forward_revenue,

	affinity_margin,

	cannibalization_margin,

	pull_forward_margin,

	RECOMMENDATION_TYPE_ID ,

	created_by,

	updated_by,

	created_at,

	updated_at,

	offer_type_id,

			contribution_margin,

			contribution_revenue

    )



SELECT

	event_id,

	promo_id, currency_id,

	scenario_id,

	recommendation_date,

	discount_level_value,

	CASE

		WHEN offer_type_scenario = ''tiered_offer'' THEN concat(effective_discount::int, '' %%'')

		ELSE OFFER_TYPE_COMBINED_DISPLAY_NAME

	END AS OFFER_TYPE_COMBINED_DISPLAY_NAME ,

	effective_discount,

	original_price,

	original_cost,

	discounted_price,

	promo_spend,

	sales_units,

	baseline_sales_units,

	incremental_sales_units,

	SALES_UNITS_LIFT,

	revenue,

	baseline_revenue,

	incremental_revenue,

	revenue_lift,

	margin,

	baseline_margin,

	incremental_margin,

	margin_lift,

	aur,

	aum,

	affinity_revenue,

	cannibalization_revenue,

	pull_forward_revenue,

	affinity_margin,

	cannibalization_margin,

	pull_forward_margin,

	RECOMMENDATION_TYPE_ID ,

	created_by,

	updated_by,

	created_at,

	updated_at,

	offer_type_id,

			contribution_margin,

			contribution_revenue

FROM

	(

	SELECT

		event_id,

		promo_id, currency_id,

		scenario_id,

		recommendation_date,

		MAX(discount_level_value) AS discount_level_value,

		MAX(OFFER_TYPE_COMBINED_DISPLAY_NAME) AS OFFER_TYPE_COMBINED_DISPLAY_NAME,

		AVG(effective_discount) AS effective_discount,

		AVG(original_price) AS original_price,

		AVG(original_cost) AS original_cost,

		AVG(discounted_price) AS discounted_price,

		SUM(promo_spend) AS promo_spend,

		SUM(sales_units) AS sales_units,

		SUM(baseline_sales_units) AS baseline_sales_units,

		SUM(incremental_sales_units) AS incremental_sales_units,

		SUM(SALES_UNITS_LIFT) AS SALES_UNITS_LIFT,

		SUM(revenue) AS revenue,

		SUM(baseline_revenue) AS baseline_revenue,

		SUM(incremental_revenue) AS incremental_revenue,

		SUM(revenue_lift) AS revenue_lift,

		SUM(margin) AS margin,

		SUM(baseline_margin) AS baseline_margin,

		SUM(incremental_margin) AS incremental_margin,

		SUM(margin_lift) AS margin_lift,

		AVG(aur) AS aur,

		AVG(aum) AS aum,

		SUM(affinity_revenue) AS affinity_revenue,

		SUM(cannibalization_revenue) AS cannibalization_revenue,

		SUM(pull_forward_revenue) AS pull_forward_revenue,

		SUM(affinity_margin) AS affinity_margin,

		SUM(cannibalization_margin) AS cannibalization_margin,

		SUM(pull_forward_margin) AS pull_forward_margin,

		MAX(RECOMMENDATION_TYPE_ID) AS RECOMMENDATION_TYPE_ID,

		MAX(created_by) AS created_by,

		MAX(updated_by) AS updated_by,

		MAX(created_at) AS created_at,

		now()::timestamptz AS updated_at,

		MAX(offer_type_id) AS offer_type_id,

			SUM(contribution_margin) AS contribution_margin,

			SUM(contribution_revenue) AS contribution_revenue

	FROM

		price_promo.%1$s

	WHERE

		scenario_id = ANY(%2$L)

		%4$s

	GROUP BY

		scenario_id,

		event_id,

		promo_id, currency_id,

		recommendation_date,

		updated_at) a

CROSS JOIN 

		(

	SELECT

		DISTINCT offer_type AS offer_type_scenario

	FROM

		price_promo.ps_scenario_discounts

	WHERE

		scenario_id = ANY(%2$L)

		) b

        RETURNING promo_id

    )

    -- Insert default rows if no rows were inserted in the previous step

    INSERT INTO price_promo.%1$s_agg (

        event_id,

        promo_id, currency_id,

        scenario_id,

        recommendation_date,

        discount_level_value,

        OFFER_TYPE_COMBINED_DISPLAY_NAME,

        effective_discount,

        original_price,

        original_cost,

        discounted_price,

        promo_spend,

        sales_units,

        baseline_sales_units,

        incremental_sales_units,

        SALES_UNITS_LIFT,

        revenue,

        baseline_revenue,

        incremental_revenue,

        revenue_lift,

        margin,

        baseline_margin,

        incremental_margin,

        margin_lift,

        aur,

        aum,

        affinity_revenue,

        cannibalization_revenue,

        pull_forward_revenue,

        affinity_margin,

        cannibalization_margin,

        pull_forward_margin,

        RECOMMENDATION_TYPE_ID,

        created_by,

        updated_by,

        created_at,

        updated_at,

        offer_type_id

    )

    SELECT 

        NULL AS event_id,

        %3$s,

        scenario_id,

        date_series AS recommendation_date,

       	discount_level_value AS discount_level_value,

        OFFER_TYPE_COMBINED_DISPLAY_NAME,

        0 AS effective_discount,

        0 AS original_price,

        0 AS original_cost,

        0 AS discounted_price,

        0 AS promo_spend,

        0 AS sales_units,

        0 AS baseline_sales_units,

        0 AS incremental_sales_units,

        0 AS SALES_UNITS_LIFT,

        0 AS revenue,

        0 AS baseline_revenue,

        0 AS incremental_revenue,

        0 AS revenue_lift,

        0 AS margin,

        0 AS baseline_margin,

        0 AS incremental_margin,

        0 AS margin_lift,

        0 AS aur,

        0 AS aum,

        0 AS affinity_revenue,

        0 AS cannibalization_revenue,

        0 AS pull_forward_revenue,

        0 AS affinity_margin,

        0 AS cannibalization_margin,

        0 AS pull_forward_margin,

        0 AS RECOMMENDATION_TYPE_ID,

        NULL AS created_by,

        NULL AS updated_by,

        CURRENT_TIMESTAMP AS created_at,

        CURRENT_TIMESTAMP AS updated_at,

		0 as offer_type_id

    FROM 

        (SELECT date_series, scenario_id,  discount_level_value, OFFER_TYPE_COMBINED_DISPLAY_NAME

         FROM (SELECT generate_series(%5$L, %6$L, ''1 day'') AS date_series) a

         CROSS JOIN (SELECT scenario_id, max(discount_level_value) AS discount_level_value, max(OFFER_TYPE_COMBINED_DISPLAY_NAME) AS OFFER_TYPE_COMBINED_DISPLAY_NAME

                     FROM price_promo.ps_scenario_discounts 

                     WHERE scenario_id = ANY(%2$L)

                     GROUP BY scenario_id) sub

         ) AS date_series_subquery

    WHERE NOT EXISTS (SELECT 1 FROM aggregated_data);', _table_name, _scenario_id, p_promo_id, _date_filter, _start_date, _end_date);

   raise notice 'refresh query for % : %', _table_name, _refresh_query;

    END LOOP;



END;

$function$
;

