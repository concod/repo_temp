--liquibase formatted sql
--changeset liquibase:tb_environment_sync_log_sync_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_environment_sync_log_sync_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_environment_sync_log_sync_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_environment_sync_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_environment_sync_log

CREATE TABLE config_schema.tb_environment_sync_log (
	sync_id integer DEFAULT nextval('config_schema.tb_environment_sync_log_sync_id_seq'::regclass) NOT NULL,
	source_context_id integer NOT NULL,
	target_context_id integer NOT NULL,
	source_version_number integer NOT NULL,
	target_version_number integer,
	sync_type varchar(20) DEFAULT 'full'::character varying NOT NULL,
	sync_status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	sync_password_verified boolean DEFAULT false,
	synced_by varchar(100) NOT NULL,
	started_at timestamp without time zone,
	completed_at timestamp without time zone,
	rollback_data jsonb,
	sync_details jsonb,
	error_message text,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_environment_sync_log_pkey PRIMARY KEY (sync_id),
	CONSTRAINT tb_environment_sync_log_source_context_id_fkey FOREIGN KEY (source_context_id) REFERENCES config_schema.tb_config_context(context_id),
	CONSTRAINT tb_environment_sync_log_target_context_id_fkey FOREIGN KEY (target_context_id) REFERENCES config_schema.tb_config_context(context_id),
	CONSTRAINT chk_sync_different_contexts CHECK ((source_context_id <> target_context_id)),
	CONSTRAINT chk_sync_status CHECK (((sync_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text, ('rolled_back'::character varying)::text])))
);
CREATE INDEX idx_sync_source ON config_schema.tb_environment_sync_log USING btree (source_context_id);
CREATE INDEX idx_sync_target ON config_schema.tb_environment_sync_log USING btree (target_context_id);
