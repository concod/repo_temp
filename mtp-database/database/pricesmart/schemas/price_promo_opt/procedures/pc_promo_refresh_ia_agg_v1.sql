--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_promo_refresh_ia_agg_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_promo_refresh_ia_agg_v1

DROP PROCEDURE if exists price_promo_opt.pc_promo_refresh_ia_agg_v1;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_promo_refresh_ia_agg_v1(IN p_promo_id integer[], IN _table_names text[] DEFAULT NULL::text[], IN _start_date date DEFAULT NULL::date, IN _end_date date DEFAULT NULL::date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _date_filter TEXT;
    _delete_query text;
    _refresh_query text;
   	_table_name text;
begin

    IF _table_names IS null then
        _table_names := ARRAY['ps_recommended_ia_projected', 'ps_recommended_stack_ia', 'ps_recommended_override_ia', 'ps_recommended_stack_override_ia'];
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
    							WHERE promo_id = ANY(%L)
								%s;', _table_name, p_promo_id, _date_filter);
	    RAISE NOTICE 'delete query for %  : %', _table_name, _delete_query;
	   execute _delete_query;

	   _refresh_query = FORMAT('
        INSERT INTO price_promo.%1$s_agg (
            event_id,
            promo_id, currency_id,
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
            RECOMMENDATION_TYPE_ID,
            created_by,
            updated_by,
            created_at,
            updated_at,
			contribution_margin,
			contribution_revenue
        )
        SELECT
            event_id, promo_id, currency_id,
            recommendation_date,
            MAX(discount_level_value) AS discount_level_value,
--            MAX(sub1.OFFER_TYPE_COMBINED_DISPLAY_NAME) 
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
            1 AS RECOMMENDATION_TYPE_ID,
            MAX(created_by) AS created_by,
            MAX(updated_by) AS updated_by,
            MAX(created_at) AS created_at,
            MAX(updated_at) AS updated_at,
			round(SUM(contribution_margin)::numeric,2) as contribution_margin,
			round(sum(contribution_revenue)::numeric,2) as contribution_revenue
        FROM
            (select * from price_promo.%1$s
        WHERE
            promo_id = any(%2$L)
			%3$s) sub2
--		left join
--			(select promo_id, max(OFFER_TYPE_COMBINED_DISPLAY_NAME) OFFER_TYPE_COMBINED_DISPLAY_NAME from price_promo.ia_ps_scenario_discounts
--         WHERE promo_id = any(%L)
--         group by 1) sub1 using(promo_id)
        GROUP BY
            event_id, promo_id, currency_id, recommendation_date
;', _table_name, p_promo_id, _date_filter, p_promo_id);
   raise notice 'refresh query for % : %', _table_name, _refresh_query;
  execute _refresh_query;
    END LOOP;

END;
$procedure$



;