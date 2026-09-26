--liquibase formatted sql
--changeset liquibase:event_store_sg_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_store_sg_hierarchy
CREATE TABLE price_promo.event_store_sg_hierarchy (
	event_id int4 NULL,
	store_group_id int4 NULL,
	store_group_name text NULL,
	hierarchy_level_id int4 NULL,
	hierarchy_level_name text NULL,
	hierarchy_value_id int4 NULL,
	hierarchy_value_name text NULL
);