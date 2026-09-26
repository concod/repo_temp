--liquibase formatted sql
--changeset liquibase:tb_discount_level_customers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_discount_level_customers
CREATE TABLE price_promo.tb_discount_level_customers (
	customer_level_id int8 NULL,
	customer_id int4 NULL,
	CONSTRAINT tb_discount_level_customers_tb_promo_customer_reco_details_fk FOREIGN KEY (customer_level_id) REFERENCES price_promo.tb_promo_customer_reco_details(customer_level_id) ON DELETE CASCADE
);