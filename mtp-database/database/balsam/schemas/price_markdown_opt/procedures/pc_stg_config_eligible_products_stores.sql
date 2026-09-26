--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_stg_config_eligible_products_stores_v061124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_config_eligible_products_stores_v2508

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_config_eligible_products_stores;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_config_eligible_products_stores(IN _inventory_limit integer DEFAULT 1)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Truncate tables before inserting new data
    TRUNCATE TABLE price_markdown_opt.tb_stg_config_eligible_products_stores_many_rank;
    TRUNCATE TABLE price_markdown_opt.tb_stg_config_eligible_products_stores;

    -- Insert all product store with configs along with age rules
    INSERT INTO price_markdown_opt.tb_stg_config_eligible_products_stores_many_rank
    (
        WITH stg_product_store_config_all AS (
            SELECT
            	b.strategy_config_id,
                a.product_id,
                a.store_id,
                coalesce(age,0) AS age_original,
                coalesce(st,0) as st,
                current_date AS todays_date,
                d.strategy_start_date,
                e.max_product_level,
                f.l2_cid,
                f.l2_id,
                f.l2_name,
                f.l2_cuq
            FROM
                "global".tb_latest_inventory a
            INNER JOIN
                price_markdown_opt.tb_stg_config_all_config_products b
                ON a.product_id = b.product_id
            INNER JOIN
                price_markdown_opt.tb_stg_config_all_config_stores c
                ON a.store_id = c.store_id
                AND b.strategy_config_id = c.strategy_config_id
            INNER JOIN
                price_markdown_opt.tb_stg_config_strategy_start_end_date d
                ON b.strategy_config_id = d.strategy_config_id
            INNER JOIN (
                SELECT
                    strategy_config_id,
                    MAX(
                        CASE
                            WHEN hierarchy_level = 100 THEN 0
                            ELSE hierarchy_level
                        END
                    ) + MAX(
                        CASE
                            WHEN hierarchy_level < 100 THEN 0
                            ELSE hierarchy_level
                        END
                    ) AS max_product_level
                FROM
                    price_markdown.tb_strategy_config_product_hierarchies
                GROUP BY
                    strategy_config_id
            ) e ON b.strategy_config_id = e.strategy_config_id
            INNER JOIN
                price_markdown.product_master f
                ON a.product_id = f.product_id
            WHERE
                a.clearance_eligible = 1
                AND a.clearance_indicator_rf = 0
        )

        SELECT
        	a.strategy_config_id,
            a.product_id,
            a.store_id,
            a.age_original,
            (a.age_original + ROUND((a.strategy_start_date - a.todays_date) / 7.0, 0))::INT4 AS age,
            a.st,
            b.age_eligible,
            b.monthly_st_eligible,
            a.todays_date,
            a.strategy_start_date,
            a.max_product_level,
            a.l2_cid,
            a.l2_id,
            a.l2_name,
            a.l2_cuq,
            ROW_NUMBER() OVER (PARTITION BY a.product_id, a.store_id ORDER BY a.max_product_level DESC) AS config_rank,
            b.age_force
        FROM
            stg_product_store_config_all a
        INNER JOIN
            price_markdown_opt.tb_stg_config_clr_rules_department b
            ON a.l2_cid = b.l2_cid
    );

    -- Insert data into the product_store table with threshold rules
    INSERT INTO price_markdown_opt.tb_stg_config_eligible_products_stores (
        product_id, store_id, age, todays_date, threshold_status, strategy_config_id
    )
    SELECT
        product_id,
        store_id,
        age,
        todays_date,
        'Eligible' AS threshold_status,
        strategy_config_id
    FROM
        price_markdown_opt.tb_stg_config_eligible_products_stores_many_rank
    WHERE
        config_rank = 1
        AND  ( (age >= age_eligible AND st < monthly_st_eligible) OR (age >= age_force) );

END $procedure$
;

