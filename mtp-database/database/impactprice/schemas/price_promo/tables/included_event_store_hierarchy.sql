--liquibase formatted sql
--changeset liquibase:included_event_store_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for included_event_store_hierarchy
CREATE TABLE price_promo.included_event_store_hierarchy (
	event_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL
);