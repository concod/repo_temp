--liquibase formatted sql
--changeset liquibase:pc_stg_config_all_config_products_stores_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_config_all_config_products_stores

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_config_all_config_products_stores();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_config_all_config_products_stores()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _strategy_config_id INT;
BEGIN
    -- Truncate table x before starting
    TRUNCATE TABLE price_markdown_opt.tb_stg_config_all_config_products;
    TRUNCATE TABLE price_markdown_opt.tb_stg_config_all_config_stores;

    -- Iterate over distinct config_id values
    FOR _strategy_config_id IN
        SELECT DISTINCT strategy_config_id FROM price_markdown.tb_strategy_config where is_active = 1
    LOOP
        -- Insert results of function call into table x
        INSERT INTO price_markdown_opt.tb_stg_config_all_config_products (strategy_config_id, product_id)
        SELECT strategy_config_id, product_or_store_id
        FROM price_markdown_opt.fn_stg_config_get_products_or_stores(_strategy_config_id,'product');

        INSERT INTO price_markdown_opt.tb_stg_config_all_config_stores (strategy_config_id, store_id)
        SELECT strategy_config_id, product_or_store_id
        FROM price_markdown_opt.fn_stg_config_get_products_or_stores(_strategy_config_id,'store');

    END LOOP;
END $procedure$
;
