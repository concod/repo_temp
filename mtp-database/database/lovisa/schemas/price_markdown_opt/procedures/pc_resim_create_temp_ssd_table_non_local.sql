--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.com:pc_resim_create_temp_ssd_table_non_local_17022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_resim_create_temp_ssd_table_non_local

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_resim_create_temp_ssd_table_non_local;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_resim_create_temp_ssd_table_non_local(
    IN _temp_table_ssd_blo text,
    IN _currency_type text,
    IN _temp_table_ssd_blo_local text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _create_table_query TEXT;
BEGIN
    _create_table_query := FORMAT('
        DROP TABLE IF EXISTS price_markdown_opt_temp.%1$s;
        CREATE TABLE price_markdown_opt_temp.%1$s AS
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
            current_timestamp as created_at,
            current_timestamp as updated_at,
            ssd.rem_inv,
            (ssd.spend * COALESCE(f.planned_conversion_multiplier, 1)) AS spend,
            ssd.sales_units_uncapped,
            ssd.previous_markdown_percentage,
            ssd.channel_info,
            CASE 
                WHEN ''%3$s'' = ''dominating'' THEN tccm.dominating_currency_id
                ELSE tccm.default_currency_id
            END AS currency_id,
            ssd.price_with_vat,
            coalesce(ppb.currency_value,0) AS effective_price_point_with_vat,
            (ssd.margin_with_vat * COALESCE(f.planned_conversion_multiplier, 1)) AS margin_with_vat,
            (ssd.revenue_with_vat * COALESCE(f.planned_conversion_multiplier, 1)) AS revenue_with_vat,
            (ssd.spend_with_vat * COALESCE(f.planned_conversion_multiplier, 1)) AS spend_with_vat,
            ssd.stat_id
        FROM price_markdown_opt_temp.%2$s ssd
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
                    WHEN ''%3$s'' = ''dominating'' THEN tccm.dominating_currency_id
                    ELSE tccm.default_currency_id
                END
        LEFT JOIN price_markdown.tb_applicable_mkd_price_points_base ppb
            ON ppb.stat_id = ssd.stat_id
           AND ppb.currency_id = 
                CASE 
                    WHEN ''%3$s'' = ''dominating'' THEN tccm.dominating_currency_id
                    ELSE tccm.default_currency_id
                END
           AND ppb.country_id = sm.s1_id
        LEFT JOIN global.tb_vat_master vm
            ON vm.s1_id = sm.s1_id;',
        _temp_table_ssd_blo, _temp_table_ssd_blo_local, _currency_type);
    
    RAISE NOTICE 'Creating temp table query: %', _create_table_query;
    EXECUTE _create_table_query;

END;
$procedure$
;