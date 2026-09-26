--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_postprocess_get_updated_gurobi_tb_effective_pp_18022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_postprocess_get_updated_gurobi_tb_effective_pp

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_postprocess_get_updated_gurobi_tb_effective_pp;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_postprocess_get_updated_gurobi_tb_effective_pp(IN _gurobi_output_tb text, IN _gurobi_output_temp text, IN _sim_temp text, IN _strategy_id text, _discounts_sim_base text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _gurobi_query TEXT;
BEGIN
    _gurobi_query := format('
        DROP TABLE IF EXISTS %1$s;

        CREATE TABLE %1$s AS
        -- gets effective price point in strategy currency type
        WITH base AS (
            SELECT DISTINCT 
                product_id, 
                product_level_id, 
                store_level_id,
                country_id, 
                currency_id as required_currency_id,
                preferred_currency_type as currency_type,
                stat_id,
                selling_price_with_vat as currency_value
            FROM %5$s
        ),
        forex_ct AS (
            SELECT 
                date, 
                source_currency_id, 
                target_currency_id, 
                planned_conversion_multiplier
            FROM global.planned_forex_rate
            WHERE date = (SELECT MAX(date) FROM global.planned_forex_rate)
        ),
        fetch_level_ids AS (
            SELECT distinct
                sim.*,
                product_level_id, 
                store_level_id, 
                required_currency_id, 
                currency_value AS effective_price_point,
                currency_type
            FROM %3$s sim
            LEFT JOIN base b
                ON b.product_id = sim.product_id 
               AND b.country_id = sim.country_id
			    AND sim.stat_id = b.stat_id
        ),
        gurobi_out AS (
            SELECT DISTINCT 
                product_level_id, 
                store_level_id, 
                event, 
                offer_identifier
            FROM %2$s a
        ),
        price_point AS (
            SELECT DISTINCT 
                g.*, 
                stat_id,
                required_currency_id as currency_id,
                currency_value as effective_price_point,
                currency_type
            FROM gurobi_out g
            LEFT JOIN fetch_level_ids fl
                ON g.product_level_id = fl.product_level_id 
               AND g.store_level_id = fl.store_level_id
               AND g.offer_identifier = fl.offer_identifier 
        ),
        get_product_store AS (
            SELECT 
                pp.*, 
                ssm.product_id, 
                ssm.store_id, 
                ssm.price_with_vat * planned_conversion_multiplier AS price_with_vat  
            FROM price_point pp
            LEFT JOIN price_markdown.tb_strategy_sku_store_mapping_%4$s ssm
                ON pp.store_level_id = ssm.store_level_id
               AND pp.product_level_id = ssm.product_level_id
            LEFT JOIN forex_ct f
                ON ssm.currency_id = f.source_currency_id
               AND pp.currency_id = f.target_currency_id
        )
        SELECT DISTINCT
            product_level_id,
            store_level_id, 
            event,
            offer_identifier, 
            currency_id,
            stat_id,
            effective_price_point,
            ROUND(AVG(100 - effective_price_point * 100 / price_with_vat)) AS base_percentage
        FROM get_product_store
        GROUP BY 1,2,3,4,5,6,7;
    ', _gurobi_output_tb, _gurobi_output_temp, _sim_temp, _strategy_id, _discounts_sim_base);

    RAISE NOTICE 'Executing gurobi query: %', _gurobi_query;
    EXECUTE _gurobi_query;
END;
$procedure$
;
