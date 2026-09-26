--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_promo_refresh_scenario_agg_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_promo_refresh_scenario_agg_v1

DROP PROCEDURE if exists price_promo_opt.pc_promo_refresh_scenario_agg_v1;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_promo_refresh_scenario_agg_v1(IN p_promo_id integer[] DEFAULT NULL::integer[], IN _scenario_id integer[] DEFAULT NULL::integer[], IN _table_names text[] DEFAULT NULL::text[], IN _start_date date DEFAULT NULL::date, IN _end_date date DEFAULT NULL::date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _date_filter TEXT; 
    _delete_query text;
    _refresh_query text;
   	_table_name text;
begin
	
	-- filter for scenarios if only promo is given
	if p_promo_id is null and _scenario_id is null then
		raise notice 'There are no scenarios to be refreshed';
	elsif p_promo_id is not null and _scenario_id is null then
		select array_agg(scenario_id) from price_promo.scenario_master sm where promo_id = any(p_promo_id) into _scenario_id;
	end if;
    
    IF _table_names IS null then
        _table_names := ARRAY['ps_recommended_scenarios', 'ps_recommended_scenarios_stack', 'ps_recommended_override', 'ps_recommended_scenarios_stack_override'];
    END IF;

    IF _start_date IS NOT NULL AND _end_date IS NOT NULL THEN
        _date_filter := FORMAT('AND recommendation_date BETWEEN %L AND %L', _start_date, _end_date);
    ELSIF _start_date IS NOT NULL THEN
        _date_filter := FORMAT('AND recommendation_date >= %L', _start_date);
    ELSIF _end_date IS NOT NULL THEN
        _date_filter := FORMAT('AND recommendation_date <= %L', _end_date);
    ELSE
        _date_filter := FORMAT('', _start_date, _end_date);
    END IF;

    FOR _table_name IN SELECT unnest(_table_names)
    LOOP
        _delete_query = format('DELETE FROM price_promo.%s_agg
    							WHERE scenario_id = ANY(%L)
								%s;', _table_name, _scenario_id, _date_filter);
	    RAISE NOTICE 'delete query for %  : %', _table_name, _delete_query;
        execute _delete_query;
	   
	   _refresh_query = FORMAT('
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
--	CASE
--		WHEN offer_type_scenario = ''tiered_offer'' THEN concat(effective_discount::int, '' %%'')
--		ELSE OFFER_TYPE_COMBINED_DISPLAY_NAME
--	END 
	NULL::varchar AS OFFER_TYPE_COMBINED_DISPLAY_NAME ,
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
--		MAX(sub1.OFFER_TYPE_COMBINED_DISPLAY_NAME) 
		NULL::varchar AS OFFER_TYPE_COMBINED_DISPLAY_NAME,
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
		0 AS RECOMMENDATION_TYPE_ID,
		MAX(created_by) AS created_by,
		MAX(updated_by) AS updated_by,
		MAX(created_at) AS created_at,
		now()::timestamptz AS updated_at,
		MAX(offer_type_id) AS offer_type_id,
			SUM(contribution_margin) AS contribution_margin,
			SUM(contribution_revenue) AS contribution_revenue
	FROM
		(select * from price_promo.%1$s
	WHERE
		scenario_id = ANY(%2$L)
		%3$s) sub2
--	Left join
--		(select scenario_id, max(OFFER_TYPE_COMBINED_DISPLAY_NAME) OFFER_TYPE_COMBINED_DISPLAY_NAME from price_promo.ps_scenario_discounts
--         WHERE scenario_id = ANY(%2$L)
--         group by 1) sub1 using(scenario_id)
	GROUP BY
		scenario_id,
		event_id,
		promo_id, currency_id,
		recommendation_date) a
--JOIN 
--		(
--	SELECT
--		DISTINCT scenario_id, offer_type AS offer_type_scenario
--	FROM
--		price_promo.ps_scenario_discounts
--	WHERE
--		scenario_id = ANY(%2$L)
--		) b
--using(scenario_id)
   ;', _table_name, _scenario_id, _date_filter);
   raise notice 'refresh query for % : %', _table_name, _refresh_query;
  execute _refresh_query;
    END LOOP;

END;
$procedure$



;