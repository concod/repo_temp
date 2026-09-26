--liquibase formatted sql
--changeset liquibase:event_product_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_product_hierarchy
CREATE TABLE price_promo.event_product_hierarchy (
	event_id int4 NOT NULL,
	hierarchy_id int8 NULL
);
CREATE INDEX event_product_hierarchy_event_id_idx ON price_promo.event_product_hierarchy USING btree (event_id);
CREATE INDEX event_product_hierarchy_hierarchy_id_idx ON price_promo.event_product_hierarchy USING btree (hierarchy_id);
CREATE INDEX idx_event_product_hierarchy_hierarchy_id_event_id ON price_promo.event_product_hierarchy USING btree (hierarchy_id, event_id);