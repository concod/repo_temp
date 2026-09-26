-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_ruleset_config_size_range_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_ruleset_config_size_range

CREATE TABLE  size_smart.tb_ruleset_config_size_range (
	id serial4 NOT NULL,
	ruleset_config_id int4 NOT NULL,
	size_config_mst_id int4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_ruleset_config_size_range_id_key UNIQUE (id),
	CONSTRAINT tb_ruleset_config_size_range_pkey PRIMARY KEY (ruleset_config_id, size_config_mst_id),
	CONSTRAINT tb_ruleset_config_size_range_ruleset_config_id_fkey FOREIGN KEY (ruleset_config_id) REFERENCES size_smart.tb_ruleset_config(id),
	CONSTRAINT tb_ruleset_config_size_range_size_config_mst_id_fkey FOREIGN KEY (size_config_mst_id) REFERENCES size_smart.tb_size_config_mst(id)
);