--liquibase formatted sql
--changeset liquibase:included_event_product_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for included_event_product_groups
CREATE TABLE price_promo.included_event_product_groups (
	event_id int4 NOT NULL,
	product_group_id int4 NOT NULL,
	CONSTRAINT included_event_product_groups_pkey PRIMARY KEY (event_id, product_group_id)
);
CREATE INDEX included_event_product_groups_idx ON price_promo.included_event_product_groups USING btree (event_id);