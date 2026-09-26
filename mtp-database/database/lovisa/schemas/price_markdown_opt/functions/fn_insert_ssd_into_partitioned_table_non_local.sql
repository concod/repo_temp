--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:fn_insert_ssd_into_partitioned_table_non_local_17022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_insert_ssd_into_partitioned_table

DROP FUNCTION IF EXISTS price_markdown_opt.fn_insert_ssd_into_partitioned_table_non_local(int4, text, int4, text, text);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_insert_ssd_into_partitioned_table_non_local(_strategy_id integer, _tb_ssd_temp_10 text, _pcd_id integer, _table_type text, _version text, _currency_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    query_1 text;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    _part_pcd_start_date text;
begin
    SELECT to_char(pcd_start_date ,'yyyymmdd') as _part_pcd_start_date
    FROM (
        SELECT t1.pcd_start_date FROM price_markdown.tb_strategy_pcd t1
        where strategy_id = _strategy_id and pcd_id = _pcd_id group by 1) tab into _part_pcd_start_date;

    query_1 := format('
		INSERT INTO price_markdown.tb_%5$s_%6$s_%7$s_%1$s_%2$s
		(
			strategy_id, product_id, store_id, product_level_id, store_level_id,
			recommendation_date, recommended_offer_percentage, effective_price_point,
			pcd_id, sales_units, margin, revenue, status, created_at, updated_at,
			created_by, updated_by, rem_inv, spend, sales_units_uncapped, previous_markdown_percentage, channel_info,
			currency_id, effective_price_point_with_vat, margin_with_vat, revenue_with_vat, spend_with_vat
		)
		SELECT
			ssd.strategy_id,
			ssd.product_id,
			ssd.store_id,
			ssd.product_level_id,
			ssd.store_level_id,
			ssd.recommendation_date,
			ssd.recommended_offer_percentage,
			coalesce(ppb.currency_value*(1-vm.vat_percentage),0) AS effective_price_point,
			ssd.pcd_id,
			ssd.sales_units,
			(ssd.margin * COALESCE(f.planned_conversion_multiplier, 1)) AS margin,
			(ssd.revenue * COALESCE(f.planned_conversion_multiplier, 1)) AS revenue,
			1 AS status,
			ssd.created_at,
			ssd.updated_at,
			0 AS created_by,
			0 AS updated_by,
			ssd.rem_inv,
			(ssd.spend * COALESCE(f.planned_conversion_multiplier, 1)) AS spend,
			ssd.sales_units_uncapped,
			ssd.previous_markdown_percentage,
			ssd.channel_info,
            CASE 
                WHEN ''%7$s'' = ''dominating'' THEN tccm.dominating_currency_id
                ELSE tccm.default_currency_id
            END AS currency_id,
			coalesce(currency_value,0) AS effective_price_point_with_vat,
			(ssd.margin_with_vat * COALESCE(f.planned_conversion_multiplier, 1)) AS margin_with_vat,
			(ssd.revenue_with_vat * COALESCE(f.planned_conversion_multiplier, 1)) AS revenue_with_vat,
			(ssd.spend_with_vat * COALESCE(f.planned_conversion_multiplier, 1)) AS spend_with_vat

		FROM %3$s ssd
		LEFT JOIN price_markdown.tb_store_master sm
			ON sm.store_id = ssd.store_id
		LEFT JOIN global.tb_country_currency_mapping tccm 
			ON tccm.country_id = sm.s1_id
		LEFT JOIN (
			SELECT DISTINCT 
				source_currency_id, 
				target_currency_id, 
				planned_conversion_multiplier
			FROM global.actual_forex_rate 
			WHERE date = (SELECT MAX(date) FROM global.actual_forex_rate)
		) f
			ON f.source_currency_id = ssd.currency_id
           AND f.target_currency_id = 
                CASE 
                    WHEN ''%7$s'' = ''dominating'' THEN tccm.dominating_currency_id
                    ELSE tccm.default_currency_id
                END
        LEFT JOIN price_markdown.tb_applicable_mkd_price_points_base ppb
            ON ppb.stat_id = ssd.stat_id
			AND ppb.country_id = sm.s1_id
           	AND ppb.currency_id = 
                CASE 
                    WHEN ''%7$s'' = ''dominating'' THEN tccm.dominating_currency_id
                    ELSE tccm.default_currency_id
                END
		LEFT JOIN global.tb_vat_master vm
			ON vm.s1_id = sm.s1_id
		WHERE ssd.pcd_id = %4$s;
;',
            _strategy_id, _part_pcd_start_date, _tb_ssd_temp_10, _pcd_id, _table_type, _version, _currency_type);

        RAISE NOTICE 'query -- %', query_1;

        start_time := clock_timestamp();
        EXECUTE query_1;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL for event %: %',  _pcd_id, end_time - start_time;

END;
$function$
;
