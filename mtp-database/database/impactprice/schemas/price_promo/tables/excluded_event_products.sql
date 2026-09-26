--liquibase formatted sql
--changeset liquibase:excluded_event_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for excluded_event_products
CREATE TABLE price_promo.excluded_event_products (
	event_id int4 NOT NULL,
	product_id int8 NOT NULL,
	CONSTRAINT excluded_event_products_pkey PRIMARY KEY (event_id, product_id)
)
PARTITION BY LIST (event_id);