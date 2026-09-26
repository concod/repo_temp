--liquibase formatted sql
--changeset liquibase:excluded_event_product_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for excluded_event_product_hierarchy
CREATE TABLE price_promo.excluded_event_product_hierarchy (
	event_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL,
	combination_identifier int4 NOT NULL,
	CONSTRAINT excluded_event_product_hierarchy_pkey PRIMARY KEY (event_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX excluded_event_product_hierarchy_idx ON price_promo.excluded_event_product_hierarchy USING btree (event_id, hierarchy_level_id, hierarchy_value_id);