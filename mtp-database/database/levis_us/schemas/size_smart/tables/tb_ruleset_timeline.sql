-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_ruleset_timeline_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_ruleset_timeline

CREATE TABLE  size_smart.tb_ruleset_timeline (
	id serial4 NOT NULL,
	ruleset_config_id int4 NOT NULL,
	timeline_id int4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_ruleset_timeline_id_key UNIQUE (id),
	CONSTRAINT tb_ruleset_timeline_pkey PRIMARY KEY (ruleset_config_id, timeline_id),
	CONSTRAINT tb_ruleset_timeline_ruleset_config_id_fkey FOREIGN KEY (ruleset_config_id) REFERENCES size_smart.tb_ruleset_config(id),
	CONSTRAINT tb_ruleset_timeline_timeline_id_fkey FOREIGN KEY (timeline_id) REFERENCES size_smart.tb_timeline(id)
);
CREATE INDEX idx_ruleset_timeline_ruleset_id ON size_smart.tb_ruleset_timeline USING btree (ruleset_config_id);
CREATE INDEX idx_ruleset_timeline_timeline_id ON size_smart.tb_ruleset_timeline USING btree (timeline_id);