--liquibase formatted sql
--changeset liquibase:surya.avinash@impactanalytics.com: pc_auto_clearance_final_eligible_products_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_auto_clearance_final_eligible_products_stores

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_auto_clearance_final_eligible_products_stores();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_auto_clearance_final_eligible_products_stores()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Clear the target table before inserting new data
    
    TRUNCATE TABLE price_markdown_opt.tb_auto_clearance_final_eligible_products_stores;

    WITH stg_config_products_stores AS (
        SELECT
            trigger_id,
            product_id,
            store_id,
            max_product_hierarchy_level,
            current_date as todays_date,
            ROW_NUMBER() OVER (PARTITION BY product_id, store_id ORDER BY max_product_hierarchy_level DESC) AS config_rank
        FROM
            price_markdown.tb_clearance_trigger_eligible_sku_stores a  
    ),


   base as (
    SELECT
        a.trigger_id,
        b.calendar_config_id,
        CONCAT(TO_CHAR(current_date, 'YYYY-MM-DD'), '_', c.name) AS strategy_name,
        b.strategy_start_date,
        b.strategy_end_date,
        a.product_id,
        a.store_id,
        a.todays_date           
    FROM
        (select * from stg_config_products_stores where config_rank = 1) a
        INNER JOIN
            price_markdown_opt.tb_stg_config_strategy_start_end_date b
            ON a.trigger_id = b.trigger_config_id
        LEFT JOIN
            price_markdown.tb_clearance_trigger_info_master c
            ON a.trigger_id = c.trigger_id
    ),

        
    conflicted_combinations_data
    as (
        SELECT
        a.strategy_config_id,
        a.calendar_config_id,
        a.strategy_name,
        a.product_id,
        a.store_id,
        a.strategy_start_date,
        a.strategy_end_date,
        a.strategy_config_name,
        1 AS rank_ps,
        CASE WHEN b.strategy_id IS NULL THEN 0 ELSE 1 END AS conflict_flag,
        ARRAY_AGG(b.strategy_id) AS conflicting_stg_id,
        STRING_AGG(b.strategy_name, ', ') AS conflicting_stg_name,
        MIN(b.start_date) AS conflicting_start_date,
        MAX(b.end_date) AS conflicting_end_date,
        a.todays_date
        FROM
        base a
    LEFT JOIN
        price_markdown_opt.tb_auto_clearance_already_existing_stg_products b
        ON a.product_id = b.product_id
        AND a.store_id = b.store_id
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15)
        
    -- Insert into the final eligible products table
    INSERT INTO price_markdown_opt.tb_auto_clearance_final_eligible_products_stores (
        trigger_id,
        calendar_config_id,
        strategy_name,
        strategy_start_date,
        strategy_end_date,
        product_id,
        store_id,
        todays_date,
        is_active
    )
    SELECT
        trigger_id,
        calendar_config_id,
        strategy_name,
        strategy_start_date,
        strategy_end_date,
        product_id,
        store_id,
        todays_date,
        TRUE AS is_active            
    FROM conflicted_combinations_data a
    WHERE
        conflict_flag = 0
        AND strategy_config_id IS NOT NULL
        AND strategy_start_date <= DATE(TIMEZONE('EST', NOW())) + 21;

END;
$procedure$
;
