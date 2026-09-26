--liquibase formatted sql
--changeset raja.duraisamy:oms_sp_update_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for oms_configurations
CREATE TABLE IF NOT EXISTS oms.oms_sp_update_config (
	id serial4 NOT NULL,
	config_id int4 NOT NULL,
	config_key varchar(255) NOT NULL,
	config_value varchar(255) NULL,
	extra json DEFAULT '{}'::json NULL,
	is_active bool DEFAULT true NOT NULL,
	is_tool_edited bool DEFAULT false NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT oms_sp_update_config_pkey PRIMARY KEY (id),
	CONSTRAINT fk_function_id FOREIGN KEY (config_id) REFERENCES oms.oms_sp_config_master(config_id)
);
CREATE INDEX idx_oms_sp_update_config_config_id_key ON oms.oms_sp_update_config USING btree (config_id, config_key);