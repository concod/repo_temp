--liquibase formatted sql
--changeset liquibase:included_event_product_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for included_event_product_hierarchy
CREATE TABLE price_promo.included_event_product_hierarchy (
	event_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar(100) NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar(100) NULL,
	CONSTRAINT included_event_product_hierarchy_pkey PRIMARY KEY (event_id, hierarchy_level_id, hierarchy_value_id)
);
CREATE INDEX included_event_product_hierarchy_idx ON price_promo.included_event_product_hierarchy USING btree (event_id, hierarchy_level_id, hierarchy_value_id);


--changeset vamsi.balaga@impactanalytics.co:included_event_product_hierarchy_hierarchy_value_name_type stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Updating the price_promo.included_event_product_hierarchy table to change the type of the hierarchy_value_name and hierarchy_level_name columns to varchar
ALTER TABLE price_promo.included_event_product_hierarchy ALTER COLUMN hierarchy_value_name TYPE varchar USING hierarchy_value_name::varchar;
ALTER TABLE price_promo.included_event_product_hierarchy ALTER COLUMN hierarchy_level_name TYPE varchar USING hierarchy_level_name::varchar;