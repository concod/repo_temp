--liquibase formatted sql
--changeset liquibase:tb_product_group_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.tb_product_group_products
CREATE TABLE price_markdown.tb_product_group_products_count (
	product_group_id int NOT NULL,
	products_count int NOT NULL
);
