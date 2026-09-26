--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_workbench_s4_get_current_view_original_v041024_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_workbench_s4_get_current_view_original_v041024_6
--rollback: SELECT 1

DROP FUNCTION IF EXISTS price_markdown.fn_workbench_s4_get_current_view_original;


CREATE OR REPLACE FUNCTION price_markdown.fn_workbench_s4_get_current_view_original(_sid integer, _product_recommendation_level integer)
 RETURNS TABLE(product_level_value text, store_level_value text, style text[], color text[], size text[], pcd_start_date date, pcd_end_date date, approval_status character varying, "IA Reco Discount" numeric, "Fin Discount" numeric, "IA Reco Price Point" numeric, "Fin Price Point" numeric, "IA Reco Units" numeric, "Fin Units" numeric, "IA Reco Revenue" numeric, "Fin Revenue" numeric, "IA Reco Margin" numeric, "Fin Margin" numeric, "IA Reco Markdown" numeric, "Fin Markdown" numeric, "IA Reco Inventory" numeric, "Fin Inventory" numeric, "IA Reco Price Point Secondary" numeric, "Fin Price Point Secondary" numeric, "IA Reco Revenue Secondary" numeric, "Fin Revenue Secondary" numeric, "IA Reco Margin Secondary" numeric, "Fin Margin Secondary" numeric, "IA Reco Markdown Secondary" numeric, "Fin Markdown Secondary" numeric, primary_currency_symbol text, secondary_currency_symbol text, product_recommendation_level integer, "IA Reco Sell Through" numeric, "Fin Sell Through" numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    vl_test_query text;
    vl_total_count int := 9999999;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    future_start_date date;
    _temp_integer int := TO_NUMBER(TO_CHAR(CURRENT_TIMESTAMP, 'HH24MISS'), '999999');
	primary_currency text := '';
	secondary_currency text := '';
	currency_multiplier numeric := 1.0;

BEGIN
    SELECT COALESCE(MIN(tsp.pcd_start_date), (
        SELECT MIN(t1.pcd_start_date)
        FROM price_markdown.tb_strategy_pcd t1
        WHERE strategy_id = _sid
    )) INTO future_start_date
    FROM price_markdown.tb_strategy_pcd tsp
    WHERE tsp.strategy_id = _sid
      AND tsp.pcd_start_date >= DATE(timezone('US/Eastern', now()));

	SELECT 
		tcm.currency_symbol INTO primary_currency FROM price_markdown.tb_strategy_master tsm 
	INNER JOIN 
		global.tb_currency_master tcm on tsm.currency_id = tcm.currency_id 
	WHERE
		tsm.strategy_id = _sid;

	IF primary_currency = '£' THEN 
	    secondary_currency := '€';
		vl_test_query := format('SELECT 
			acr.planned_conversion_multiplier
		FROM 
			global.actual_forex_rate acr
		WHERE 
			acr.source_currency_id = (SELECT currency_id FROM global.tb_currency_master WHERE currency_symbol=''%1$s'') 
		AND 
			acr.target_currency_id = (SELECT currency_id FROM global.tb_currency_master WHERE currency_symbol=''%2$s'')
		AND
			acr.date = current_date;', primary_currency, secondary_currency);

		RAISE NOTICE 'currency multiplier query --%', vl_test_query;

	    start_time := clock_timestamp();

	    EXECUTE vl_test_query INTO currency_multiplier;
		currency_multiplier := COALESCE(currency_multiplier, 1);

	    end_time := clock_timestamp();
	    RAISE NOTICE 'Time taken currency multiplier query statement: %', end_time - start_time;		
	END IF;	

    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4d_invdisc_%1$s_%2$s;', _sid, _temp_integer);
    vl_test_query := format(
        'CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4d_invdisc_%1$s_%2$s AS
        (
            SELECT product_level_id, store_level_id, array_agg(distinct pm.product_name) as product_name,
			array_agg(distinct pm.l5_cuq) as style,
			array_agg(distinct pm.l6_cuq) as color,
			array_agg(distinct pm.l7_cuq) as size
            FROM price_markdown.tb_strategy_sku_store_mapping_%1$s a
            INNER JOIN global.tb_latest_inventory b
            ON a.product_id = b.product_id
            AND a.store_id = b.store_id
			INNER JOIN price_markdown.product_master pm
			ON pm.product_id = a.product_id
            GROUP BY 1, 2
        );', _sid, _temp_integer);

    RAISE NOTICE 'query- 0 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 0 statement: %', end_time - start_time;

    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4d_alldisc_%1$s_%2$s;', _sid, _temp_integer);
    vl_test_query := format(
        'CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4d_alldisc_%1$s_%2$s AS
        (
            SELECT
                a.product_level_id,
                a.store_level_id,
                a.pcd_id,
                a.product_level_value,
                a.store_level_value,
                a.approval_status,
                d.pcd_start_date,
                d.pcd_end_date,
                a.markdown_percentage AS fin_discount,
                b.markdown_percentage AS ia_discount,
				e.product_name,
				e.style,
				e.color,
				e.size
            FROM
				price_markdown.tb_strategy_discount_%1$s a
            LEFT JOIN
				price_markdown.tb_strategy_discount_ia_%1$s b
            ON a.product_level_id = b.product_level_id
            AND a.store_level_id = b.store_level_id
            AND a.pcd_id = b.pcd_id
            INNER JOIN
				price_markdown.tb_strategy_pcd d
            ON a.strategy_id = d.strategy_id
			AND a.pcd_id = d.pcd_id
            INNER JOIN
				price_markdown_opt_temp.tb_s4d_invdisc_%1$s_%2$s e
            ON a.product_level_id = e.product_level_id
            AND a.store_level_id = e.store_level_id
            WHERE d.pcd_start_date >= ''%3$s''
        );', _sid, _temp_integer, future_start_date);

    RAISE NOTICE 'query- 1 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;

    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4d_fin_%1$s_%2$s;', _sid, _temp_integer);
    vl_test_query := format(
        'CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4d_fin_%1$s_%2$s AS
        (
            SELECT
                product_level_id,
                store_level_id,
                fin.pcd_id,
                SUM(sales_units) AS sales_units,
                SUM(revenue) AS revenue,
                SUM(margin) AS margin,
                AVG(effective_price_point) AS effective_price_point,
                SUM(spend) AS spend,
				SUM(CASE WHEN recommendation_date = pcd_start_date then sales_units + rem_inv else 0 end) AS rem_inv
            FROM
				price_markdown.tb_agg_fin_%1$s fin
			INNER JOIN
            	price_markdown.tb_strategy_pcd tsp
            ON fin.strategy_id = tsp.strategy_id
            AND fin.pcd_id = tsp.pcd_id
            WHERE recommendation_date >= ''%3$s''
            GROUP BY 1, 2, 3
        );', _sid, _temp_integer, future_start_date);

    RAISE NOTICE 'query- 2 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4d_ia_%1$s_%2$s;', _sid, _temp_integer);
    vl_test_query := format(
        'CREATE UNLOGGED TABLE price_markdown_opt_temp.tb_s4d_ia_%1$s_%2$s AS
        (
            SELECT
                product_level_id,
                store_level_id,
                ia.pcd_id,
                SUM(sales_units) AS sales_units,
                SUM(revenue) AS revenue,
                SUM(margin) AS margin,
                AVG(effective_price_point) AS effective_price_point,
                SUM(spend) AS spend,
                SUM(CASE WHEN recommendation_date = pcd_start_date then sales_units + rem_inv else 0 end) AS rem_inv
            FROM price_markdown.tb_agg_ia_%1$s ia
			INNER JOIN
            	price_markdown.tb_strategy_pcd tsp
            ON ia.strategy_id = tsp.strategy_id
            AND ia.pcd_id = tsp.pcd_id
            WHERE recommendation_date >= ''%3$s''
            GROUP BY 1, 2, 3
        );', _sid, _temp_integer, future_start_date);

    RAISE NOTICE 'query- 3 --%', vl_test_query;
    start_time := clock_timestamp();
    EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;

    vl_test_query := format(
        'SELECT
            a.product_level_value::text,
            a.store_level_value::text,
			%9$s,
			%10$s,
			%11$s,
            a.pcd_start_date,
            a.pcd_end_date,
			a.approval_status::character varying,
            ROUND(a.ia_discount::numeric, 0) AS "IA Reco Discount",
            ROUND(a.fin_discount::numeric, 0) AS "Fin Discount",
            ROUND(c.effective_price_point::numeric, 2) AS "IA Reco Price Point",
            ROUND(b.effective_price_point::numeric, 2) AS "Fin Price Point",
            ROUND(c.sales_units::numeric, 2) AS "IA Reco Units",
            ROUND(b.sales_units::numeric, 2) AS "Fin Units",
            ROUND(c.revenue::numeric, 2) AS "IA Reco Revenue",
            ROUND(b.revenue::numeric, 2) AS "Fin Revenue",
            ROUND(c.margin::numeric, 2) AS "IA Reco Margin",
            ROUND(b.margin::numeric, 2) AS "Fin Margin",
            ROUND(c.spend::numeric, 2) AS "IA Reco Markdown",
            ROUND(b.spend::numeric, 2) AS "Fin Markdow",
            ROUND(c.rem_inv::numeric, 2) AS "IA Reco Inventory",
            ROUND(b.rem_inv::numeric, 2) AS "Fin Inventory",
			ROUND(c.effective_price_point::numeric, 2) * %7$s AS "IA Reco Price Point Secondary",
            ROUND(b.effective_price_point::numeric, 2) * %7$s AS "Fin Price Point Secondary",
			ROUND(c.revenue::numeric, 2) * %7$s AS "IA Reco Revenue Secondary",
            ROUND(b.revenue::numeric, 2) * %7$s AS "Fin Revenue Secondary",
            ROUND(c.margin::numeric, 2) * %7$s AS "IA Reco Margin Secondary",
            ROUND(b.margin::numeric, 2) * %7$s AS "Fin Margin Secondary",
            ROUND(c.spend::numeric, 2) * %7$s AS "IA Reco Markdown Secondary",
            ROUND(b.spend::numeric, 2) * %7$s AS "Fin Markdown Secondary",
			''%5$s'' as primary_currency_symbol,
			''%6$s'' as secondary_currency_symbol,
			''%8$s''::int as product_recommendation_level,
			COALESCE(
			    ROUND((c.sales_units * 100 / NULLIF(c.rem_inv, 0))::numeric, 2),
			    0
			) AS "IA Reco Sell Through",
			
			COALESCE(
			    ROUND((b.sales_units * 100 / NULLIF(b.rem_inv, 0))::numeric, 2),
			    0
			) AS "Fin Sell Through"
        FROM
			price_markdown_opt_temp.tb_s4d_alldisc_%1$s_%2$s a
        LEFT JOIN
			price_markdown_opt_temp.tb_s4d_fin_%1$s_%2$s b
        ON a.product_level_id = b.product_level_id
        AND a.store_level_id = b.store_level_id
        AND a.pcd_id = b.pcd_id
        LEFT JOIN
			price_markdown_opt_temp.tb_s4d_ia_%1$s_%2$s c
        ON a.product_level_id = c.product_level_id
        AND a.store_level_id = c.store_level_id
        AND a.pcd_id = c.pcd_id;',
		_sid, _temp_integer,
		CASE WHEN _product_recommendation_level = 7 THEN 'a.product_level_value::text as "BrandSKU"' ELSE 'NULL::text as "BrandSKU"' END,
		CASE WHEN _product_recommendation_level = 7 THEN 'a.product_name::text[] as "Product Name"' ELSE 'NULL::text[] as "Product Name"' END,
		primary_currency, secondary_currency, currency_multiplier, _product_recommendation_level,
		CASE WHEN _product_recommendation_level = 7 THEN 'a.style::text[]' ELSE 'NULL::text[] as "style"' END,
		CASE WHEN _product_recommendation_level = 7 THEN 'a.color::text[]' ELSE 'NULL::text[] as "color"' END,
		CASE WHEN _product_recommendation_level = 7 THEN 'a.size::text[]' ELSE 'NULL::text[] as "size"' END
	);

    RAISE NOTICE 'query- 5 A --%', vl_test_query;
    start_time := clock_timestamp();
    RETURN QUERY EXECUTE vl_test_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken SQL 5 A statement: %', end_time - start_time;

    -- Drop temporary tables
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4d_alldisc_%s_%2$s', _sid, _temp_integer);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4d_fin_%s_%2$s', _sid, _temp_integer);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4d_ia_%s_%2$s', _sid, _temp_integer);
    EXECUTE format('DROP TABLE IF EXISTS price_markdown_opt_temp.tb_s4d_invdisc_%s_%2$s', _sid, _temp_integer);
END;
$function$
;
