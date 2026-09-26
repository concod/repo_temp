--liquibase formatted sql
--changeset liquibase:product_image stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_image
CREATE TABLE IF NOT EXISTS inventory_smart.product_image (
    product_code TEXT,
    article TEXT,
    product_image_link TEXT,
    CONSTRAINT product_image_un UNIQUE (product_code)
);

