--liquibase formatted sql
--changeset liquibase:included_event_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for included_event_stores
CREATE TABLE price_promo.included_event_stores (
	event_id int4 NOT NULL,
	store_id int8 NOT NULL,
	CONSTRAINT included_event_stores_pkey PRIMARY KEY (event_id, store_id)
)
PARTITION BY LIST (event_id);