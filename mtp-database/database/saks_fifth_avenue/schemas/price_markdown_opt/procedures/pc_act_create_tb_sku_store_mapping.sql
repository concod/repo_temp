--liquibase formatted sql
--changeset liquibase:pc_act_create_tb_sku_store_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_act_create_tb_sku_store_mapping

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_act_create_tb_sku_store_mapping(IN _sid integer[]);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_act_create_tb_sku_store_mapping(IN _sid integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Drop the table if it exists
    DROP TABLE IF EXISTS price_markdown_opt.tb_act_sku_store_mapping;

    -- Create the table
    CREATE TABLE price_markdown_opt.tb_act_sku_store_mapping AS
    SELECT strategy_id, product_id, store_id, product_level_id, store_level_id, price
    FROM price_markdown.tb_strategy_sku_store_mapping
    WHERE strategy_id = ANY(_sid);

    -- Create index on product_id column
    CREATE INDEX tb_act_sku_store_mapping_h5_idx ON price_markdown_opt.tb_act_sku_store_mapping USING btree(product_id);
END;
$procedure$
;