--liquibase formatted sql
--changeset liquibase:tb_discount_level_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_discount_level_products
CREATE TABLE price_promo.tb_discount_level_products (
	product_level_id int8 NULL,
	product_id int4 NULL,
	CONSTRAINT tb_discount_level_products_tb_promo_product_reco_details_fk FOREIGN KEY (product_level_id) REFERENCES price_promo.tb_promo_product_reco_details(product_level_id) ON DELETE CASCADE
);
