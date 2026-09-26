--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_preprocess_get_discounts_filter_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_discounts_filter

drop procedure if exists price_markdown_opt.pc_preprocess_get_discounts_filter;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_discounts_filter(
	IN _discounts_filter_table TEXT,
    IN _strategy_id INTEGER,
    IN _strategy_discount TEXT,
    IN _currency_type TEXT,
    IN _forex_rate TEXT,
    IN _tb_strategy_sku_store_mapping TEXT,
    IN _store_master TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _discounts_filter_query TEXT;
BEGIN
    _discounts_filter_query = FORMAT('
        DROP TABLE IF EXISTS %1$s;
        CREATE TABLE %1$s AS
        (
            WITH 
			app_disc_base AS(
				SELECT 
					product_id,
					store_id,
					markdown_percentage,
					price_with_vat,
					''%4$s'' AS currency_type
				FROM %6$s,
				(SELECT UNNEST(applicable_value) AS markdown_percentage
					FROM price_markdown.tb_strategy_rule a1
					INNER JOIN (
						SELECT rule_id, rule_type
						FROM price_markdown.tb_rule_master trm
					) a2
					ON a1.constraint_id = a2.rule_id
					WHERE strategy_id = %2$s
					AND rule_type = 47
					AND status = 0) b
			),			
			reco_disc_base AS (
                SELECT 
                    product_level_id, 
                    store_level_id, 
                    markdown_percentage,
                    ''%4$s'' AS currency_type
                FROM %3$s_%2$s
                WHERE (is_locked = 1 OR approval_status = ''Finally Approved'')
                GROUP BY 1,2,3,4
				--UNION DISTINCT
				--select * from app_disc_base
				
            ),
            forex_ct AS (
                -- conversion multipliers
                SELECT  
                    source_currency_id, 
                    target_currency_id, 
                    planned_conversion_multiplier
                FROM %5$s
                WHERE date = (SELECT MAX(date) FROM %5$s)
            ),									
            reco_disc AS (
                SELECT 
					DISTINCT
                    product_id, 
                    CASE
                        WHEN d.currency_type = ''dominating'' THEN s0_id
                        WHEN d.currency_type = ''local'' THEN s1_id 
                        ELSE 1 
                    END AS country_id,
					ssm.currency_id  as local_currency_id,
                    markdown_percentage,
                    CASE 
                        WHEN d.currency_type = ''dominating'' THEN tccm.dominating_currency_id 
                        WHEN d.currency_type = ''local'' THEN ssm.currency_id  
                        ELSE 2 
                    END AS currency_id,
                    price_with_vat * planned_conversion_multiplier AS price_with_vat_converted
                FROM reco_disc_base d
                INNER JOIN %6$s_%2$s ssm
                    ON d.product_level_id = ssm.product_level_id
                    AND d.store_level_id = ssm.store_level_id
                INNER JOIN %7$s sm
                    ON sm.store_id = ssm.store_id
                INNER JOIN (
                    SELECT DISTINCT currency_id, dominating_currency_id 
                    FROM global.tb_country_currency_mapping
                ) tccm
                    ON tccm.currency_id = ssm.currency_id 
                INNER JOIN forex_ct fr
                    ON ssm.currency_id = fr.source_currency_id 
                    AND (
                        (d.currency_type = ''dominating'' AND tccm.dominating_currency_id = fr.target_currency_id)
                        OR (d.currency_type = ''global'' AND fr.target_currency_id = 2)
                        OR (d.currency_type = ''local'' AND ssm.currency_id = fr.target_currency_id)
                    )
            ),
			get_stats as(
            SELECT 
                rd.product_id, 
                rd.country_id, 
                rd.currency_id,
				rd.local_currency_id, 
                rd.markdown_percentage AS effective_opt_discount_exact,
				price_with_vat_converted,
                (ARRAY_AGG(pp.stat_id ORDER BY pp.currency_value DESC))[1] AS stat_id
            FROM reco_disc rd
            LEFT JOIN price_markdown.tb_applicable_mkd_price_points pp
                ON rd.product_id = pp.product_id 
                AND rd.currency_id = pp.currency_id
                AND ROUND(rd.markdown_percentage) = ROUND(100 * (1 - pp.currency_value / price_with_vat_converted))
            GROUP BY 1,2,3,4,5,6
			)
			select distinct s.product_id, s.country_id, s.currency_id, s.stat_id,
			currency_value*planned_conversion_multiplier as selling_price_with_vat,
			ROUND(100 - currency_value*planned_conversion_multiplier/price_with_vat_converted) AS effective_opt_discount_exact
			from get_stats s
			inner join forex_ct f
			on s.local_currency_id = f.source_currency_id
			and s.currency_id = f.target_currency_id
			LEFT JOIN price_markdown.tb_applicable_mkd_price_points pp
                ON s.product_id = pp.product_id 
                AND s.local_currency_id = pp.currency_id
				and s.stat_id = pp.stat_id

        );
    ', _discounts_filter_table, _strategy_id, _strategy_discount, _currency_type, _forex_rate, _tb_strategy_sku_store_mapping, _store_master);

    RAISE NOTICE '_discounts_filter_query: %', _discounts_filter_query;
    EXECUTE _discounts_filter_query;
END;
$procedure$;
