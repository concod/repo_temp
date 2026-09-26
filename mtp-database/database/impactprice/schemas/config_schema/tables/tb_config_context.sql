--liquibase formatted sql
--changeset liquibase:tb_config_context_context_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_config_context_context_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_config_context_context_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_config_context stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_config_context

CREATE TABLE config_schema.tb_config_context (
	context_id integer DEFAULT nextval('config_schema.tb_config_context_context_id_seq'::regclass) NOT NULL,
	application_id integer NOT NULL,
	client_id integer NOT NULL,
	environment_id integer NOT NULL,
	context_label varchar(255),
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_config_context_application_id_client_id_environment_id_key UNIQUE (application_id, client_id, environment_id),
	CONSTRAINT tb_config_context_pkey PRIMARY KEY (context_id),
	CONSTRAINT tb_config_context_application_id_fkey FOREIGN KEY (application_id) REFERENCES config_schema.tb_application_mst(id) ON DELETE RESTRICT,
	CONSTRAINT tb_config_context_client_id_fkey FOREIGN KEY (client_id) REFERENCES config_schema.tb_client_mst(client_id) ON DELETE RESTRICT,
	CONSTRAINT tb_config_context_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES config_schema.tb_environment_mst(environment_id) ON DELETE RESTRICT
);
CREATE INDEX idx_ctx_active ON config_schema.tb_config_context USING btree (is_active);
CREATE INDEX idx_ctx_application ON config_schema.tb_config_context USING btree (application_id);
CREATE INDEX idx_ctx_client ON config_schema.tb_config_context USING btree (client_id);
CREATE INDEX idx_ctx_environment ON config_schema.tb_config_context USING btree (environment_id);
