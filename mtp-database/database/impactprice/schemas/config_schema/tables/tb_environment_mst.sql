--liquibase formatted sql
--changeset liquibase:tb_environment_mst_environment_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_environment_mst_environment_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_environment_mst_environment_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_environment_mst stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_environment_mst

CREATE TABLE config_schema.tb_environment_mst (
	environment_id integer DEFAULT nextval('config_schema.tb_environment_mst_environment_id_seq'::regclass) NOT NULL,
	env_code varchar(20) NOT NULL,
	env_name varchar(100) NOT NULL,
	env_description text,
	env_order integer NOT NULL,
	env_color varchar(50),
	is_active boolean DEFAULT true,
	requires_approval_to_sync boolean DEFAULT false,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	parent_environment_id integer,
	CONSTRAINT tb_environment_mst_env_code_key UNIQUE (env_code),
	CONSTRAINT tb_environment_mst_pkey PRIMARY KEY (environment_id),
	CONSTRAINT tb_environment_mst_parent_environment_id_fkey FOREIGN KEY (parent_environment_id) REFERENCES config_schema.tb_environment_mst(environment_id) ON DELETE RESTRICT
);
CREATE INDEX idx_env_active ON config_schema.tb_environment_mst USING btree (is_active);
CREATE INDEX idx_env_code ON config_schema.tb_environment_mst USING btree (env_code);
CREATE INDEX idx_env_order ON config_schema.tb_environment_mst USING btree (env_order);
