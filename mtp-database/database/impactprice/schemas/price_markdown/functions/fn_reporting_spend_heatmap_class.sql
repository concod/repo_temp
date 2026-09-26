--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_reporting_spend_heatmap_class runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_reporting_spend_heatmap_class
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_reporting_spend_heatmap_class();
CREATE OR REPLACE FUNCTION price_markdown.fn_reporting_spend_heatmap_class(_sid integer[], _start_date date, _end_date date, _product_h1_id integer[], _product_h2_id integer[], _product_h3_id integer[], _product_h4_id integer[], _product_h5_id integer[], _store_h1_id integer[], _store_h2_id integer[], _store_h3_id integer[], _store_h4_id integer[], _store_h5_id integer[], _store_h6_id integer[])
 RETURNS TABLE(name character varying, level character varying, "Start Date" date, "End Date" date, "Actual Markdown Spend" numeric, "Forecasted Markdown Spend" numeric, value numeric)
	LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH product_filter AS (
    SELECT
        product_h1_id, product_h1_name AS division_name,
        product_h2_id, product_h2_name AS department_name,
        product_h3_id, product_h3_name AS class_name,
        product_h4_id, product_h4_name AS subclass_name,
        product_id, product_name,
        price, cost
    FROM price_markdown.fn_reporting_get_products(
        _product_h1_id, _product_h2_id, _product_h3_id, _product_h4_id, _product_h5_id
    )
	),
	store_filter AS (
	    SELECT
	        channel,
	        store_h6_id,
	        store_h6_name AS store_description
	    FROM price_markdown.fn_reporting_get_stores(_store_h1_id, _store_h2_id, _store_h3_id, _store_h4_id, _store_h5_id, _store_h6_id)
	),
	strategy_filter AS (
	    SELECT
	        strategy_name,
	        strategy_id
	    FROM price_markdown.tb_strategy_master x
	    WHERE strategy_id = ANY(_sid)
	),
	time_period_filter AS (
	    SELECT
	        DISTINCT fiscal_year,
	        fiscal_month,
	        fiscal_week,
	        dates
	    FROM price_markdown.fiscal_date_mapping b
	    WHERE dates >= _start_date AND dates <= _end_date
	),
	perm_strategy AS (
	    SELECT
	        strategy_id,
	        unnest(applicable_value) AS end_rule
	    FROM price_markdown.tb_strategy_rule t1
	    INNER JOIN (
	        SELECT
	            rule_id,
	            rule_type
	        FROM price_markdown.tb_rule_master trm
	    ) t2 ON t1.constraint_id = t2.rule_id
	    WHERE strategy_id  = ANY(_sid)
	    AND constraint_type  = 0
	    AND status = 0
	    AND rule_type = 44 -- Ending_Rule
	)
	,

	actuals_spend_cte as
	(
	SELECT class_name ,
			min(recommendation_date) as start_date,
			max(recommendation_date) as end_date,
			ROUND(SUM(spend)::numeric,2) as spend
	        FROM price_markdown.fn_create_strategies_union_query(_sid, 'actuals', _start_date, _end_date) a
	        JOIN strategy_filter b USING(strategy_id)
	        JOIN product_filter c USING(product_id)
	        JOIN store_filter d USING(store_h6_id)
	        JOIN time_period_filter e ON a.recommendation_date = e.dates
			GROUP BY 1
	),


	forecast_spend_cte as
	(
	SELECT class_name,
			min(recommendation_date) as start_date,
			max(recommendation_date) as end_date,
			ROUND(SUM(spend)::numeric,2) as spend
	        FROM price_markdown.fn_create_strategies_union_query(_sid, 'finalized', CURRENT_DATE-1, _end_date) a
	        JOIN strategy_filter b USING(strategy_id)
	        JOIN product_filter c USING(product_id)
	        JOIN store_filter d USING(store_h6_id)
	        JOIN time_period_filter e ON a.recommendation_date = e.dates
			GROUP BY 1
	)

	select class_name,
	'Class'::character varying,
	coalesce(a.start_date,b.start_date) as start_date,
	coalesce(b.end_date,a.end_date) as end_date,
	ROUND(coalesce(a.spend,0)::numeric,0) as actual_spend,
	ROUND(coalesce(b.spend,0)::numeric,0) as forecast_spend,
	ROUND(coalesce(a.spend,0) + coalesce(b.spend,0)::numeric,0) as total_spend
	from actuals_spend_cte a
	full outer join forecast_spend_cte b
	using(class_name)
	;


END;
$function$
;