--liquibase formatted sql
--changeset liquibase:excluded_event_product_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for excluded_event_product_groups
CREATE TABLE price_promo.excluded_event_product_groups (
	event_id int4 NOT NULL,
	product_group_id int4 NOT NULL,
	CONSTRAINT excluded_event_product_groups_pkey PRIMARY KEY (event_id, product_group_id)
);
CREATE INDEX excluded_event_product_groups_idx ON price_promo.excluded_event_product_groups USING btree (event_id);