--liquibase formatted sql
--changeset liquibase:tb_application_mst_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_application_mst_id_seq
CREATE SEQUENCE IF NOT EXISTS config_schema.tb_application_mst_id_seq
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 2147483647
  START WITH 1
  NO CYCLE;
  
--changeset liquibase:tb_application_mst stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_application_mst
CREATE TABLE config_schema.tb_application_mst (
	id integer DEFAULT nextval('config_schema.tb_application_mst_id_seq'::regclass) NOT NULL,
	code varchar(50) NOT NULL,
	name varchar(100) NOT NULL,
	display_name varchar(100),
	description text,
	base_route_path varchar(100) NOT NULL,
	icon_path varchar(255),
	background_color varchar(50),
	is_active boolean DEFAULT true,
	display_order integer DEFAULT 0,
	owner_team varchar(100),
	contact_email varchar(255),
	meta_data jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_application_mst_code_key UNIQUE (code),
	CONSTRAINT tb_application_mst_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_application_active ON config_schema.tb_application_mst USING btree (is_active);
CREATE INDEX idx_application_code ON config_schema.tb_application_mst USING btree (code);
CREATE INDEX idx_module_active_only ON config_schema.tb_application_mst USING btree (display_order) WHERE (is_active = true);
CREATE INDEX idx_module_list_covering ON config_schema.tb_application_mst USING btree (display_order) INCLUDE (code, name, is_active, icon_path) WHERE (is_active = true);
CREATE INDEX idx_module_name_text ON config_schema.tb_application_mst USING btree (lower((name)::text) text_pattern_ops);
