--liquibase formatted sql
--changeset ezhil.kannan@impactanalytics.co:assort_smart.line_plan_sister_style_mapping stripComments:false splitStatements:false context:MTP-109182 labels:create_table
--comment: initial changeset for line_plan_sister_style_mapping

CREATE TABLE assort_smart.line_plan_sister_style_mapping (
    article TEXT NULL,
    season_code VARCHAR(100) NULL,
    season_name TEXT NULL,
    collar TEXT NULL,
    collection TEXT NULL,
    collaboration TEXT NULL,
    end_use TEXT NULL,
    layer TEXT NULL,
    length TEXT NULL,
    fabric TEXT NULL,
    silhouette TEXT NULL,
    sleeve TEXT NULL,
    property TEXT NULL,
    stitch_gauge TEXT NULL,
    pattern TEXT NULL,
    product_print TEXT NULL,
    type_fashion_grade TEXT NULL,
    l1_name TEXT NULL,
    l2_name TEXT NULL,
    l3_name TEXT NULL,
    l4_name TEXT NULL,
    program TEXT NULL,
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

--changeset ayush.chouksey@impactanalytics.co:assort_smart.line_plan_sister_style_mapping_add_image_name_url stripComments:false splitStatements:false context:MTP-131792 labels:add_columns
--comment: Adding image_name_url column

ALTER TABLE assort_smart.line_plan_sister_style_mapping
    ADD COLUMN image_name_url VARCHAR NULL;
