--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_stg_config_final_eligible_products_stores_v091024 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_config_final_eligible_products_stores

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_config_final_eligible_products_stores();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_config_final_eligible_products_stores()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Clear the target table before inserting new data
    TRUNCATE TABLE price_markdown_opt.tb_stg_config_intermediate_eligible_products_stores;
    TRUNCATE TABLE price_markdown_opt.tb_stg_config_final_eligible_products_stores;

    WITH stg_config_products_stores AS (
        SELECT
            a.strategy_config_id,
            a.product_id,
            a.store_id,
            a.todays_date,
            a.threshold_status,
            b.calendar_config_id,
            b.strategy_start_date,
            b.strategy_end_date,
            c.strategy_config_name,
            CONCAT(d.l1_cuq, '_', TO_CHAR(a.todays_date, 'YYYY-MM-DD'), '_', c.strategy_config_name) AS strategy_name
        FROM
            price_markdown_opt.tb_stg_config_eligible_products_stores a
        INNER JOIN
            price_markdown_opt.tb_stg_config_strategy_start_end_date b
            ON a.strategy_config_id = b.strategy_config_id
        LEFT JOIN
            price_markdown.tb_strategy_config c
            ON a.strategy_config_id = c.strategy_config_id
        LEFT JOIN
            price_markdown.product_master d
            ON a.product_id = d.product_id
    )


    INSERT INTO price_markdown_opt.tb_stg_config_intermediate_eligible_products_stores (
        strategy_config_id,
        calendar_config_id,
        strategy_name,
        product_id,
        store_id,
        strategy_start_date,
        strategy_end_date,
        strategy_config_name,
        rank_ps,
        conflict_flag,
        conflicting_stg_id,
        conflicting_stg_name,
        conflicting_start_date,
        conflicting_end_date,
        age,
        todays_date,
        threshold_status
    )
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
        -100 AS age,
        a.todays_date,
        a.threshold_status
    FROM
        stg_config_products_stores a
    LEFT JOIN
        price_markdown_opt.tb_stg_config_already_existing_stg_products b
        ON a.product_id = b.product_id
        AND a.store_id = b.store_id
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17;

    -- Insert into the final eligible products table
    INSERT INTO price_markdown_opt.tb_stg_config_final_eligible_products_stores (
        strategy_config_id,
        calendar_config_id,
        strategy_name,
        strategy_start_date,
        strategy_end_date,
        product_id,
        store_id,
        age,
        todays_date,
        threshold_status,
        is_active
    )
    SELECT
        strategy_config_id,
        calendar_config_id,
        strategy_name,
        strategy_start_date,
        strategy_end_date,
        product_id,
        store_id,
        age,
        todays_date,
        threshold_status,
        TRUE AS is_active
    FROM
        price_markdown_opt.tb_stg_config_intermediate_eligible_products_stores
    WHERE
        conflict_flag = 0
        AND strategy_config_id IS NOT NULL
        AND strategy_start_date <= DATE(TIMEZONE('EST', NOW())) + 21;

END;
$procedure$
;


