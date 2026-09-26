--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_attributes_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_attributes_mapping

CREATE TABLE base_pricing.bp_product_attributes_mapping (
	product_id int8 NOT NULL,
	image text NULL,
	product_name text NULL,
	"attributes" jsonb NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_product_attributes_mapping_pkey PRIMARY KEY (product_id)
);

CREATE INDEX idx_bp_product_attributes_mapping_attributes ON base_pricing.bp_product_attributes_mapping USING gin (attributes);
CREATE INDEX idx_bp_product_attributes_mapping_product ON base_pricing.bp_product_attributes_mapping USING btree (product_id);