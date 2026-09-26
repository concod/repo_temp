--liquibase formatted sql
--changeset liquibase:tb_promo_customers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_customers
CREATE TABLE price_promo.tb_promo_customers (
	promo_id int4 NOT NULL,
	customer_id int8 NOT NULL,
	customer_name varchar NULL,
	CONSTRAINT tb_promo_customers_pkey PRIMARY KEY (promo_id, customer_id)
);