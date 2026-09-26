--liquibase formatted sql
--changeset liquibase:tb_configuration_drafts_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_configuration_drafts_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_configuration_drafts_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_configuration_drafts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_configuration_drafts

CREATE TABLE config_schema.tb_configuration_drafts (
	id integer DEFAULT nextval('config_schema.tb_configuration_drafts_id_seq'::regclass) NOT NULL,
	screen_config_id integer,
	user_id varchar(100) NOT NULL,
	draft_data jsonb NOT NULL,
	draft_type varchar(50) DEFAULT 'full'::character varying,
	entity_id varchar(100),
	is_auto_saved boolean DEFAULT false,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	expires_at timestamp without time zone,
	base_version_number integer,
	CONSTRAINT tb_configuration_drafts_pkey PRIMARY KEY (id),
	CONSTRAINT tb_configuration_drafts_screen_config_id_fkey FOREIGN KEY (screen_config_id) REFERENCES config_schema.tb_screen_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_draft_expiry ON config_schema.tb_configuration_drafts USING btree (expires_at);
CREATE INDEX idx_draft_screen ON config_schema.tb_configuration_drafts USING btree (screen_config_id);
CREATE UNIQUE INDEX idx_draft_unique_lineage ON config_schema.tb_configuration_drafts USING btree (screen_config_id, user_id, draft_type, COALESCE(entity_id, ''::character varying), COALESCE((base_version_number)::text, '-1'::text));
CREATE INDEX idx_draft_updated ON config_schema.tb_configuration_drafts USING btree (updated_at DESC);
CREATE INDEX idx_draft_user ON config_schema.tb_configuration_drafts USING btree (user_id);
