--liquibase formatted sql
--changeset liquibase:event_product stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_product
CREATE TABLE price_promo.event_product (
	event_id int4 NOT NULL,
	product_id int8 NOT NULL,
	CONSTRAINT event_product_pkey PRIMARY KEY (event_id, product_id)
)
PARTITION BY LIST (event_id);