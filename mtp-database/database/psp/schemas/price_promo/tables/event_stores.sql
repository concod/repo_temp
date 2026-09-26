--liquibase formatted sql
--changeset liquibase:event_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_stores
CREATE TABLE price_promo.event_stores (
	event_id int4 NOT NULL,
	store_id int8 NOT NULL,
	CONSTRAINT event_stores_pkey PRIMARY KEY (event_id, store_id)
)
PARTITION BY LIST (event_id);