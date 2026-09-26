-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_ruleset_config_escalation_level_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_ruleset_config_escalation_level
CREATE TABLE  size_smart.tb_ruleset_config_escalation_level (
	id serial4 NOT NULL,
	ruleset_config_id int4 NOT NULL,
	escalation_level_id int4 NOT NULL,
	"order" int4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_ruleset_config_escalation_level_id_key UNIQUE (id),
	CONSTRAINT tb_ruleset_config_escalation_level_pkey PRIMARY KEY (ruleset_config_id, escalation_level_id),
	CONSTRAINT tb_ruleset_config_escalation_level_escalation_level_id_fkey FOREIGN KEY (escalation_level_id) REFERENCES size_smart.tb_escalation_level(id),
	CONSTRAINT tb_ruleset_config_escalation_level_ruleset_config_id_fkey FOREIGN KEY (ruleset_config_id) REFERENCES size_smart.tb_ruleset_config(id)
);