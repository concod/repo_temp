--liquibase formatted sql
--changeset liquibase:tb_event_customer_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_event_customer_hierarchy
CREATE TABLE IF NOT EXISTS price_promo.tb_event_customer_hierarchy (
	event_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL,
	CONSTRAINT tb_event_customer_hierarchy_pkey PRIMARY KEY (event_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX if not exists tb_event_customer_hierarchy_idx ON price_promo.tb_event_customer_hierarchy USING btree (event_id, hierarchy_level_id, hierarchy_value_id);