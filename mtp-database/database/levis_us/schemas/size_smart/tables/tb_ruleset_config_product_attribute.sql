-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_ruleset_config_product_attribute_modifications_03 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-03 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-03 
-- comment: updated changeset for tb_ruleset_config_product_attribute_03

CREATE TABLE IF NOT EXISTS size_smart.tb_ruleset_config_product_attribute (
	id serial4 NOT NULL,
	ruleset_config_id int4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	product_attribute_level jsonb NULL,
	product_attribute_values jsonb NULL,
	CONSTRAINT tb_ruleset_config_product_attribute_id_key UNIQUE (id),
	CONSTRAINT tb_ruleset_config_product_attribute_ruleset_config_id_fkey FOREIGN KEY (ruleset_config_id) REFERENCES size_smart.tb_ruleset_config(id)
);

