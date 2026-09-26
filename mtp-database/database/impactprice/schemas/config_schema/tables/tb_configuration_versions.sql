--liquibase formatted sql
--changeset liquibase:tb_configuration_versions_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_configuration_versions_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_configuration_versions_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_configuration_versions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_configuration_versions

CREATE TABLE config_schema.tb_configuration_versions (
	id integer DEFAULT nextval('config_schema.tb_configuration_versions_id_seq'::regclass) NOT NULL,
	screen_config_id integer,
	version_number integer NOT NULL,
	version_label varchar(255),
	version_description text,
	snapshot jsonb NOT NULL,
	is_published boolean DEFAULT false,
	published_at timestamp without time zone,
	published_by varchar(100),
	is_current boolean DEFAULT false,
	rollback_from_version integer,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100) NOT NULL,
	base_version_number integer,
	patch_number integer,
	CONSTRAINT tb_configuration_versions_screen_config_id_version_number_key UNIQUE (screen_config_id, version_number),
	CONSTRAINT tb_configuration_versions_pkey PRIMARY KEY (id),
	CONSTRAINT tb_configuration_versions_screen_config_id_fkey FOREIGN KEY (screen_config_id) REFERENCES config_schema.tb_screen_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_version_published ON config_schema.tb_configuration_versions USING btree (is_published);
CREATE INDEX idx_version_created_at ON config_schema.tb_configuration_versions USING btree (created_at DESC);
CREATE INDEX idx_version_current ON config_schema.tb_configuration_versions USING btree (is_current);
CREATE INDEX idx_version_current_only ON config_schema.tb_configuration_versions USING btree (screen_config_id) WHERE (is_current = true);
CREATE INDEX idx_version_number ON config_schema.tb_configuration_versions USING btree (version_number DESC);
CREATE INDEX idx_version_published_only ON config_schema.tb_configuration_versions USING btree (screen_config_id, version_number DESC) WHERE (is_published = true);
CREATE INDEX idx_version_screen ON config_schema.tb_configuration_versions USING btree (screen_config_id);
