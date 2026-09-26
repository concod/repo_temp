--liquibase formatted sql
--changeset liquibase:tb_configuration_audit_log_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_configuration_audit_log_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_configuration_audit_log_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_configuration_audit_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_configuration_audit_log

CREATE TABLE config_schema.tb_configuration_audit_log (
	id integer DEFAULT nextval('config_schema.tb_configuration_audit_log_id_seq'::regclass) NOT NULL,
	entity_type varchar(50) NOT NULL,
	entity_id integer NOT NULL,
	entity_code varchar(100),
	screen_id varchar(100),
	application_id integer,
	action varchar(20) NOT NULL,
	old_values jsonb,
	new_values jsonb,
	changed_fields jsonb,
	changed_by varchar(100) NOT NULL,
	changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	ip_address varchar(50),
	user_agent varchar(500),
	session_id varchar(100),
	request_id varchar(100),
	CONSTRAINT tb_configuration_audit_log_pkey PRIMARY KEY (id),
	CONSTRAINT tb_configuration_audit_log_application_id_fkey FOREIGN KEY (application_id) REFERENCES config_schema.tb_application_mst(id) ON DELETE SET NULL
);
CREATE INDEX idx_audit_action ON config_schema.tb_configuration_audit_log USING btree (action);
CREATE INDEX idx_audit_application ON config_schema.tb_configuration_audit_log USING btree (application_id);
CREATE INDEX idx_audit_changed_fields_gin ON config_schema.tb_configuration_audit_log USING gin (changed_fields);
CREATE INDEX idx_audit_entity ON config_schema.tb_configuration_audit_log USING btree (entity_type, entity_id);
CREATE INDEX idx_audit_entity_action ON config_schema.tb_configuration_audit_log USING btree (entity_type, entity_id, action);
CREATE INDEX idx_audit_module_date ON config_schema.tb_configuration_audit_log USING btree (application_id, changed_at DESC);
CREATE INDEX idx_audit_screen ON config_schema.tb_configuration_audit_log USING btree (screen_id);
CREATE INDEX idx_audit_timestamp ON config_schema.tb_configuration_audit_log USING btree (changed_at DESC);
CREATE INDEX idx_audit_user ON config_schema.tb_configuration_audit_log USING btree (changed_by);
