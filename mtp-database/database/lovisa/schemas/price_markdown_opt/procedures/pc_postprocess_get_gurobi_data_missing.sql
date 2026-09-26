--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_postprocess_get_gurobi_data_missing_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: procedure to impute missing gurobi base percentage data

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_postprocess_get_gurobi_data_missing;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_postprocess_get_gurobi_data_missing(
    IN _strategy_id INTEGER,
    IN _gurobi_output TEXT,
    IN _item_opt_mapping TEXT,
    IN _generic_cadence TEXT,
    IN _strategy_pcd TEXT,
    IN _starting_pcd_start_date DATE
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    _query TEXT;
BEGIN
    _query := FORMAT('
        WITH opt_levels AS (
            SELECT 
                CAST(SPLIT_PART(opt_level_bins, ''_'', 1) AS INT) AS product_level_id,
                CAST(SPLIT_PART(opt_level_bins, ''_'', 2) AS INT) AS store_level_id,
                include_from_date
            FROM (
                SELECT opt_level_bins, include_from_date
                FROM %1$s
                GROUP BY 1,2
            ) tb1
        ),
        opt_event_base AS (
            SELECT 
                v1.product_level_id, 
                v1.store_level_id,
                CAST(v2.pcd_id AS FLOAT) AS event
            FROM opt_levels v1
            CROSS JOIN (
                SELECT CAST(pcd_id AS TEXT) AS pcd_id, pcd_start_date
                FROM %5$s
                WHERE strategy_id = %2$s
            ) v2
            WHERE v2.pcd_start_date >= v1.include_from_date
              AND v2.pcd_start_date >= ''%6$s''
        ),
        max_disc AS (
            SELECT 
                product_level_id, 
                store_level_id, 
                MAX(base_percentage) AS bp_max
            FROM %3$s
            GROUP BY 1,2
        ),
        missing_base AS (
            SELECT 
                product_level_id, 
                store_level_id, 
                event, 
                base_percentage
            FROM opt_event_base
            LEFT JOIN %3$s
            USING(product_level_id, store_level_id, event)
            WHERE base_percentage IS NULL
        ),
        imputed_discounts AS (
            SELECT 
                a1.product_level_id, 
                a1.store_level_id, 
                a1.event,
                COALESCE(a1.base_percentage, GREATEST(bp_max, CAST(SPLIT_PART(offer_identifier, ''_'', 3) AS INT))) AS base_percentage,
                CONCAT(''percent_off_'', COALESCE(a1.base_percentage, GREATEST(bp_max, CAST(SPLIT_PART(offer_identifier, ''_'', 3) AS INT)))) AS offer_identifier
            FROM missing_base a1
            LEFT JOIN max_disc USING(product_level_id, store_level_id)
            JOIN %4$s gc
              ON a1.product_level_id = gc.product_level_id
             AND a1.store_level_id = gc.store_level_id
             AND a1.event = gc.event
        )
        INSERT INTO %3$s (product_level_id, store_level_id, event, base_percentage, offer_identifier)
        SELECT 
            product_level_id, store_level_id, event, base_percentage, offer_identifier
        FROM imputed_discounts;
    ', _item_opt_mapping, _strategy_id, _gurobi_output, _generic_cadence, _strategy_pcd, _starting_pcd_start_date);

    RAISE NOTICE 'Executing query: %', _query;
    EXECUTE _query;

    RAISE NOTICE 'Gurobi missing data imputation completed successfully.';
END;
$procedure$;
