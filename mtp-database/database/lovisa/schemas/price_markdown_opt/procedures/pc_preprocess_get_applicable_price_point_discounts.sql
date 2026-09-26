--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_preprocess_get_applicable_price_point_discounts_17022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_applicable_price_point_discounts

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_applicable_price_point_discounts;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_applicable_price_point_discounts(
IN _discounts_sim_base text,
IN _strategy_id integer,
IN _preferred_currency_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _discounts_sim_base_query text;
BEGIN

    _discounts_sim_base_query := format(
    '
    DROP TABLE IF EXISTS price_markdown_opt_temp.%1$I;

    CREATE TABLE price_markdown_opt_temp.%1$I AS
    (
        WITH applicable_prices_reco_level AS (
            SELECT distinct
                apr.product_level_id,
                apr.store_level_id,
                apr.currency_id,
                apr.stat_id,
                apr.currency_value,
                apr.min_price,
                CASE 
                    WHEN %3$L = ''local'' THEN apr.country_id
                    WHEN %3$L = ''dominating'' THEN ccm.territory_id
                    ELSE 1 
                END AS mapped_country_id
            FROM price_markdown_opt.fn_applicable_price_points_reco_level(%2$s, %3$L) apr
            LEFT JOIN global.tb_country_currency_mapping ccm ON apr.country_id = ccm.country_id
        ),
        min_prices AS (
            SELECT 
                product_level_id,
                store_level_id,
                MIN(min_price) AS base_applicable_min_price
            FROM applicable_prices_reco_level
            GROUP BY product_level_id, store_level_id
        ),
        ssm_tab AS (
            SELECT 
                ssm.product_level_id,
                ssm.store_level_id,
                ssm.product_id,
                CASE 
                    WHEN %3$L = ''local'' THEN sm.s1_id
                    WHEN %3$L = ''dominating'' THEN ccm.territory_id
                    ELSE 1 
                END AS mapped_country_id,
                CASE 
                    WHEN %3$L = ''local'' THEN AVG(psp.msrp_with_vat)
                    WHEN %3$L = ''dominating'' THEN AVG(psp.msrp_territory_with_vat)
                    ELSE AVG(psp.msrp_default_with_vat)
                END AS price_with_vat
            FROM price_markdown.tb_strategy_sku_store_mapping_%2$s ssm
            INNER JOIN price_markdown.tb_product_store_price psp
                ON ssm.product_id = psp.product_id 
               AND ssm.store_id = psp.store_id
            INNER JOIN price_markdown.tb_store_master sm
                ON psp.store_id = sm.store_id
            LEFT JOIN global.tb_country_currency_mapping ccm ON sm.s1_id = ccm.country_id
            GROUP BY 
                ssm.product_level_id,
                ssm.store_level_id,
                ssm.product_id,
                CASE 
                    WHEN %3$L = ''local'' THEN sm.s1_id
                    WHEN %3$L = ''dominating'' THEN ccm.territory_id
                    ELSE 1 
                END
        )
        SELECT
            ssm.product_id,
            ssm.product_level_id,
            ssm.store_level_id,
            ssm.mapped_country_id AS country_id,
            ap.currency_id,
            MAX(ap.stat_id) AS stat_id,
            ap.currency_value AS selling_price_with_vat,
            base_applicable_min_price as base_applicable_price_with_vat,
            AVG(ssm.price_with_vat) AS avg_price_with_vat,
            ROUND(AVG(100 - ap.currency_value * 100 / ssm.price_with_vat)) 
                AS effective_opt_discount_exact,
            %3$L AS preferred_currency_type
        FROM ssm_tab ssm
        LEFT JOIN applicable_prices_reco_level ap
            ON ssm.product_level_id = ap.product_level_id
           AND ssm.store_level_id = ap.store_level_id
           AND ssm.mapped_country_id = ap.mapped_country_id
        INNER JOIN min_prices mp
            ON ssm.product_level_id = mp.product_level_id
           AND ssm.store_level_id = mp.store_level_id
        WHERE ap.currency_value <= mp.base_applicable_min_price
        GROUP BY
            ssm.product_id,
            ssm.product_level_id,
            ssm.store_level_id,
            ssm.mapped_country_id,
            ap.currency_id,
            ap.currency_value,
            base_applicable_min_price,
            preferred_currency_type
    );
    ',
    _discounts_sim_base,     -- %1$I table name (safe identifier)
    _strategy_id,            -- %2$s strategy id
    _preferred_currency_type -- %3$L literal currency type
    );

    RAISE NOTICE 'Base applicable price point query: %', _discounts_sim_base_query;

    EXECUTE _discounts_sim_base_query;

END;
$procedure$;
