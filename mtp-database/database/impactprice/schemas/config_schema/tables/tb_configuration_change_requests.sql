--liquibase formatted sql
--changeset liquibase:tb_configuration_change_requests_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_configuration_change_requests_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_configuration_change_requests_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_configuration_change_requests stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_configuration_change_requests

CREATE TABLE config_schema.tb_configuration_change_requests (
	id integer DEFAULT nextval('config_schema.tb_configuration_change_requests_id_seq'::regclass) NOT NULL,
	screen_config_id integer,
	requested_by varchar(100) NOT NULL,
	requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	change_type varchar(50) NOT NULL,
	change_description text,
	proposed_changes jsonb NOT NULL,
	status varchar(20) DEFAULT 'pending'::character varying,
	reviewed_by varchar(100),
	reviewed_at timestamp without time zone,
	review_comments text,
	applied_at timestamp without time zone,
	version_created integer,
	CONSTRAINT tb_configuration_change_requests_pkey PRIMARY KEY (id),
	CONSTRAINT tb_configuration_change_requests_screen_config_id_fkey FOREIGN KEY (screen_config_id) REFERENCES config_schema.tb_screen_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_change_request_screen ON config_schema.tb_configuration_change_requests USING btree (screen_config_id);
CREATE INDEX idx_change_request_status ON config_schema.tb_configuration_change_requests USING btree (status);
