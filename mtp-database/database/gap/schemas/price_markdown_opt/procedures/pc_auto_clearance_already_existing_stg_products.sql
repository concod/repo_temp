--liquibase formatted sql
--changeset liquibase:surya.avinash@impactanalytics.com: pc_auto_clearance_already_existing_stg_products runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_auto_clearance_already_existing_stg_products

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_auto_clearance_already_existing_stg_products();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_auto_clearance_already_existing_stg_products()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Truncate table before starting
    TRUNCATE TABLE price_markdown_opt.tb_auto_clearance_already_existing_stg_products;

    -- Insert results of function call into table
    INSERT INTO price_markdown_opt.tb_auto_clearance_already_existing_stg_products (
        strategy_id, product_id, store_id, strategy_name, status, start_date, end_date
    )
    SELECT
        a.strategy_id,
        a.product_id,
        a.store_id,
        b.strategy_name,
        b.status,
        b.start_date,
        b.end_date
    FROM
        price_markdown.tb_strategy_sku_store_mapping a
    INNER JOIN
        price_markdown.tb_strategy_master b
    ON
        a.strategy_id = b.strategy_id
    WHERE
        b.status IN (1, 2, 3)
        AND b.end_date > DATE(TIMEZONE('EST', NOW()))
        AND a.product_id IN (
            SELECT product_id
            FROM price_markdown.tb_clearance_trigger_eligible_sku_stores
            GROUP BY product_id
        );
END;
$procedure$
;