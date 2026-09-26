--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_group_attributes_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_group_attributes_10

CREATE TABLE base_pricing.bp_product_group_attributes (
	product_group_id int4 NOT NULL,
	attribute_id int4 NULL,
	attribute_name varchar(255) NOT NULL,
	attribute_value varchar(255) NOT NULL,
	CONSTRAINT bp_product_group_attributes_pkey PRIMARY KEY (product_group_id, attribute_name, attribute_value)
)
PARTITION BY LIST (product_group_id);
CREATE INDEX idx_product_group_id ON  base_pricing.bp_product_group_attributes USING btree (product_group_id);
CREATE INDEX idx_product_group_id_attribute_id ON  base_pricing.bp_product_group_attributes USING btree (product_group_id, attribute_id);
CREATE INDEX idx_product_group_id_attribute_name ON  base_pricing.bp_product_group_attributes USING btree (product_group_id, attribute_name);