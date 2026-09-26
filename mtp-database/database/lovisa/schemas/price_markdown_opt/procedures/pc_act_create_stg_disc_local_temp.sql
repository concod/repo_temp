--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_act_create_stg_disc_local_temp_03032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_act_create_stg_disc_local_temp

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_act_create_stg_disc_local_temp;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_act_create_stg_disc_local_temp(
    IN _strategy_ids INTEGER[],
    IN _disc_local_temp_table TEXT,
    IN _sku_store TEXT
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    _temp_disc_query TEXT;
BEGIN

    RAISE NOTICE 'Dropping table if exists: %', _disc_local_temp_table;
    EXECUTE format('DROP TABLE IF EXISTS %1$s', _disc_local_temp_table);

    RAISE NOTICE 'Creating table: %', _disc_local_temp_table;

    _temp_disc_query := format('
        CREATE TABLE %1$s AS
        WITH base AS (
            SELECT 
                ssm.strategy_id,
                ssm.product_level_id,
                ssm.store_level_id,
                ssm.product_id, 
                ssm.store_id, 
                ssm.currency_id AS local_currency_id, 
                ssm.price_with_vat, 
                ssm.price,
                sm.s1_id AS country_id
            FROM %2$s ssm
            LEFT JOIN price_markdown.tb_store_master sm
            on sm.store_id = ssm.store_id
              
        ),
        get_stat_id AS (
            SELECT 
                a.strategy_id,
                a.id,
                a.product_level_id, 
                a.store_level_id, 
                a.pcd_id, 
                a.markdown_percentage, 
                a.is_locked, 
                a.effective_price_point AS pp_temp, 
                a.currency_id,
                a.channel_info,
                MAX(ppb.stat_id) AS stat_id
                -- used dominating view because in case of multiple strategies there will be cases where local view is not present
            FROM (SELECT * FROM price_markdown.tb_strategy_discount_dominating 
                WHERE strategy_id = ANY(%3$L::integer[])) a
            LEFT JOIN base b
                ON a.product_level_id = b.product_level_id
                AND a.store_level_id = b.store_level_id
            LEFT JOIN price_markdown.tb_applicable_mkd_price_points_base ppb
                ON a.currency_id = ppb.currency_id
                AND a.effective_price_point = ppb.currency_value
                AND b.country_id = ppb.country_id
            GROUP BY 1,2,3,4,5,6,7,8,9,10
        ),
        get_updated_mkd_pp AS (
            SELECT 
                a.strategy_id,
                a.id,
                b.product_level_id, 
                b.store_level_id, 
                b.product_id, 
                b.store_id, 
                b.country_id,
                a.pcd_id, 
                b.local_currency_id,
                b.price_with_vat, 
                b.price,
                a.currency_id,
                a.pp_temp,
                a.markdown_percentage, 
                a.stat_id,
                a.channel_info
            FROM base b
            INNER JOIN get_stat_id a
                ON a.product_level_id = b.product_level_id
                AND a.store_level_id = b.store_level_id
                AND a.strategy_id = b.strategy_id
        ),
        stat_map AS (
            SELECT 
                strategy_id,
                id,
                product_level_id, 
                store_level_id, 
                product_id, 
                store_id, 
                pcd_id, 
                channel_info,
                local_currency_id AS currency_id,
                -- if country in Cyprus, Lebanon, Ghana overiding discount to 50
                case when pp.country_id in (12,17,26) then 50 
                else round(100 * (1 - currency_value / price_with_vat)) end AS markdown_percentage,
                case when pp.country_id in (12,17,26) then price*0.50 
                else price * (currency_value / price_with_vat) end AS effective_price_point,
                case when pp.country_id in (12,17,26) then price_with_vat*0.50 
                else currency_value end AS effective_price_point_with_vat,
                pp.stat_id
            FROM get_updated_mkd_pp pp
            LEFT JOIN price_markdown.tb_applicable_mkd_price_points_base ppb
                ON pp.stat_id = ppb.stat_id 
                AND pp.local_currency_id = ppb.currency_id
				AND pp.country_id = ppb.country_id
        ),
        max_mkd_percent AS (
            SELECT 
                strategy_id,
                product_id, 
                store_id, 
                MAX(markdown_percentage) AS prev_mkd_disc
            FROM stat_map
            GROUP BY 1,2,3
        ),
        prev_disc AS (
            SELECT 
                sm.*,
                COALESCE(
                    LAG(markdown_percentage) OVER (PARTITION BY product_level_id, store_level_id ORDER BY pcd_id), 
                    prev_mkd_disc, 
                    0
                ) AS previous_markdown_percentage
            FROM stat_map sm
            LEFT JOIN max_mkd_percent USING (product_id, store_id)
        )
        SELECT * FROM prev_disc;', _disc_local_temp_table, _sku_store, _strategy_ids);

    RAISE NOTICE 'Executing final query for table %: %', _disc_local_temp_table, _temp_disc_query;
    EXECUTE _temp_disc_query;

    RAISE NOTICE 'Successfully created table %', _disc_local_temp_table;

END;
$procedure$;
