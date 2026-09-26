--liquibase formatted sql
--changeset ezhil.kannan@impactanalytics.co:assort_smart.line_plan_sister_style_mapping stripComments:false splitStatements:false context:MTP-109182 labels:create_table
--comment: initial changeset for line_plan_sister_style_mapping

CREATE TABLE assort_smart.line_plan_sister_style_mapping (
    article TEXT NULL,
    season_code VARCHAR(100) NULL,
    season_name TEXT NULL,
    color TEXT NULL,
    info_material_description TEXT NULL,
    l0_name TEXT NULL,
    l1_name TEXT NULL,
    l2_name TEXT NULL,
    l3_name TEXT NULL,
    sales NUMERIC NULL,
    sales_qty BIGINT NULL,
    rcpts_qty BIGINT NULL,
    receipts_price NUMERIC NULL,
    total_cost NUMERIC NULL,
    msrp_ly NUMERIC NULL,
    aur NUMERIC NULL,
    aps NUMERIC NULL,
    gross_margin_perc NUMERIC NULL,
    channel TEXT NULL
);


--changeset ezhil.kannan@impactanalytics.co:assort_smart.line_plan_sister_style_mapping_add_style_columns stripComments:false splitStatements:false context:MTP-109182 labels:add_columns
--comment: Adding style, color_id, style_name, color_name columns

ALTER TABLE assort_smart.line_plan_sister_style_mapping
    ADD COLUMN style TEXT NULL,
    ADD COLUMN color_id TEXT NULL,
    ADD COLUMN style_name TEXT NULL,
    ADD COLUMN color_name TEXT NULL;
