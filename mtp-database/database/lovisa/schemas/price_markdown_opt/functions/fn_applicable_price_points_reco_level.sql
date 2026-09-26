--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:fn_applicable_price_points_reco_level_27022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_applicable_price_points_reco_level

DROP FUNCTION IF EXISTS price_markdown_opt.fn_applicable_price_points_reco_level;

 CREATE OR REPLACE FUNCTION price_markdown_opt.fn_applicable_price_points_reco_level(
    p_strategy_id integer,
    p_currency_view text
)
RETURNS TABLE (
    product_level_id integer,
    store_level_id   integer,
    currency_id      integer,
    currency_value   float,
    stat_id          integer,
    country_id       integer,
    min_price		float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_sql text;
BEGIN

    v_sql := format(
    '
    WITH pli_sli_currency_map AS (
        SELECT product_level_id, store_level_id, currency_id, min_price
        FROM price_markdown.fn_get_step3_min_price_and_currency_bulk(%1$s, %2$L)
    ),
    store_level_country_temp AS (
        SELECT DISTINCT 
            sssm.product_level_id,
            sssm.store_level_id,
            pscm.currency_id,
            tsm.s1_id AS country_id,
			min_price
        FROM price_markdown.tb_strategy_sku_store_mapping_%1$s sssm
        LEFT JOIN pricesmart.tb_store_master tsm 
            ON sssm.store_id = tsm.store_id
        INNER JOIN pli_sli_currency_map pscm 
            ON sssm.product_level_id = pscm.product_level_id
            AND sssm.store_level_id = pscm.store_level_id
    ),
    store_product_level_country_map AS (
        SELECT
            store_level_id,
            product_level_id,
            currency_id,
            country_id,
			min_price,
            count(*) OVER (
                PARTITION BY store_level_id, product_level_id
            ) AS country_count
        FROM store_level_country_temp
    ),
    applicable_pp_filter_1 as(
    select * from price_markdown.tb_applicable_mkd_price_points 
    where country_id in (select distinct country_id from store_product_level_country_map)
    ),
    applicable_pp_filter_2 as(
    select * from applicable_pp_filter_1
    where product_id in (select distinct product_id from price_markdown.tb_strategy_sku_store_mapping_%1$s)
    ),
	applicable_pp as(
	SELECT distinct ap.stat_id, ap.product_id, ap.currency_id, ap.country_id, ap.currency_value, 
			ssm.product_level_id, ssm.store_level_id
			from applicable_pp_filter_2 ap
			INNER JOIN price_markdown.tb_strategy_sku_store_mapping_%1$s ssm
			ON ap.product_id = ssm.product_id
			INNER JOIN pricesmart.tb_store_master tsm 
				ON ssm.store_id = tsm.store_id
				and tsm.s1_id = ap.country_id
	),
    applicable_currency_country_mapping AS (
        SELECT
            splcm.product_level_id,
            splcm.store_level_id,
            tamppb.stat_id,
            tamppb.currency_id,
            tamppb.country_id,
            tamppb.currency_value,
            splcm.country_count,
			min_price
        FROM store_product_level_country_map splcm
        LEFT JOIN applicable_pp tamppb
            ON tamppb.country_id = splcm.country_id
            AND tamppb.currency_id = splcm.currency_id
			AND tamppb.product_level_id = splcm.product_level_id 
			AND tamppb.store_level_id = splcm.store_level_id
		WHERE currency_value <= min_price
    ),
    common_currency_values AS (
        SELECT
            product_level_id,
            store_level_id,
            currency_id,
            currency_value
        FROM applicable_currency_country_mapping
        GROUP BY
            product_level_id,
            store_level_id,
            currency_id,
            currency_value
        HAVING count(DISTINCT country_id) = max(country_count)
    )
    SELECT DISTINCT
        tm.product_level_id::int,
        tm.store_level_id::int,
        tm.currency_id::int,
        tm.currency_value::float,
        tm.stat_id::int,
        tm.country_id::int,
		tm.min_price ::float
    FROM applicable_currency_country_mapping tm
    INNER JOIN common_currency_values ccv
        ON ccv.product_level_id = tm.product_level_id
        AND ccv.store_level_id = tm.store_level_id
        AND ccv.currency_id = tm.currency_id
        AND ccv.currency_value = tm.currency_value
    ',
    p_strategy_id,
    p_currency_view
    );

    -- Debug output
    RAISE NOTICE 'Executing query: %', v_sql;

    RETURN QUERY EXECUTE v_sql;

END;
$function$;