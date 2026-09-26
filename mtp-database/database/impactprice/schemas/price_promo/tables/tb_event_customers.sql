--liquibase formatted sql
--changeset liquibase:tb_event_customers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_event_customers
CREATE TABLE IF NOT EXISTS price_promo.tb_event_customers (
	event_id int4 NOT NULL,
	customer_id int8 NOT NULL,
	CONSTRAINT tb_event_customers_pkey PRIMARY KEY (event_id, customer_id)
);