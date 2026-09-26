--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:fn_override_discount_17022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_override_discount

DROP FUNCTION IF EXISTS price_markdown_opt.fn_override_discount;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_override_discount(
    _strategy_id integer,
    _currency_view text,
    _discount_input integer
)
RETURNS TABLE (
    product_level_id bigint,
    store_level_id bigint,
    currency_id integer,
    product_id bigint,
    store_id bigint,
    currency_value numeric,
    stat_id integer,
    markdown_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_sql text;
BEGIN

    v_sql := format($fmt$

        WITH base AS (
            SELECT
                ssm.product_level_id,
                ssm.store_level_id,
                ssm.product_id,
                ssm.store_id,
                sm.s1_id AS country_id,
                CASE
                    WHEN %2$L = 'local' THEN psp.msrp_with_vat
                    WHEN %2$L = 'dominating' THEN psp.msrp_territory_with_vat
                    ELSE psp.msrp_default_with_vat
                END AS price_with_vat,
                CASE
                    WHEN %2$L = 'local' THEN psp.currency_id
                    WHEN %2$L = 'dominating' THEN psp.territory_currency_id
                    ELSE psp.default_currency_id
                END AS currency_id
            FROM price_markdown.tb_strategy_sku_store_mapping_%1$s ssm
            INNER JOIN price_markdown.tb_product_store_price psp
                ON psp.store_id = ssm.store_id
               AND psp.product_id = ssm.product_id
            INNER JOIN price_markdown.tb_store_master sm
                ON sm.store_id = ssm.store_id
            WHERE ssm.store_level_id IN (
                SELECT store_level_id
                FROM price_markdown_opt.fn_get_single_country_store_levels(%1$s)
            )
        ),
        max_stats AS (
            SELECT
                ap.country_id,
                ap.currency_id,
                MAX(ap.stat_id) AS stat_id
            FROM price_markdown.tb_applicable_mkd_price_points_base ap
            INNER JOIN (
                SELECT DISTINCT country_id, currency_id
                FROM base
            ) b
                ON b.country_id = ap.country_id
               AND b.currency_id = ap.currency_id
            GROUP BY ap.country_id, ap.currency_id
        )
        SELECT
            b.product_level_id,
            b.store_level_id,
            b.currency_id,
            b.product_id,
            b.store_id,
            b.price_with_vat * (1 - %3$s::numeric / 100) AS currency_value,
            s.stat_id,
            %3$s AS markdown_percentage
        FROM base b
        INNER JOIN max_stats s
            ON b.country_id = s.country_id
           AND b.currency_id = s.currency_id

    $fmt$,
    _strategy_id,
    _currency_view,
    _discount_input
    );

    RAISE NOTICE E'\nOverride Discount Query:\n%\n', v_sql;

    RETURN QUERY EXECUTE v_sql;

END;
$function$;
