-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_ruleset_config_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_ruleset_config

CREATE TABLE size_smart.tb_ruleset_config (
	id serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	rule_config_id int4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	levels jsonb NULL,
	product_attribute_list jsonb NULL,
	CONSTRAINT tb_ruleset_config_id_key UNIQUE (id),
	CONSTRAINT tb_ruleset_config_pkey PRIMARY KEY (name, rule_config_id),
	CONSTRAINT tb_ruleset_config_rule_config_id_fkey FOREIGN KEY (rule_config_id) REFERENCES size_smart.tb_rule_config(id)
);

-- changeset akashkumar.rana@impactanalytics.co:tb_ruleset_config_modifications_01 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: updated changeset for tb_ruleset_config_modifications_01
ALTER TABLE size_smart.tb_ruleset_config 
DROP COLUMN product_attribute_list;


-- changeset akashkumar.rana@impactanalytics.co:tb_ruleset_config_modifications_02 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-02 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-02 
-- comment: updated changeset for tb_ruleset_config_modifications_02

ALTER TABLE size_smart.tb_ruleset_config
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE size_smart.tb_ruleset_config
ADD COLUMN status VARCHAR NOT NULL DEFAULT 'Active';

