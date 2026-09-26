--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_group_attributes stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_group_attributes

CREATE TABLE base_pricing.bp_store_group_attributes (
	store_group_id int4 NOT NULL,
	attribute_id int4 NULL,
	attribute_name varchar(255) NOT NULL,
	attribute_value varchar(255) NOT NULL,
	CONSTRAINT bp_store_group_attributes_pkey PRIMARY KEY (store_group_id, attribute_name, attribute_value)
)
PARTITION BY LIST (store_group_id);

CREATE INDEX idx_store_group_id ON  base_pricing.bp_store_group_attributes USING btree (store_group_id);
CREATE INDEX idx_store_group_id_attribute_id ON  base_pricing.bp_store_group_attributes USING btree (store_group_id, attribute_id);
CREATE INDEX idx_store_group_id_attribute_name ON  base_pricing.bp_store_group_attributes USING btree (store_group_id, attribute_name);