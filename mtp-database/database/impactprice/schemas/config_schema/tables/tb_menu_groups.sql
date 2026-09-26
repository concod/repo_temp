--liquibase formatted sql
--changeset liquibase:tb_menu_groups_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_menu_groups_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_menu_groups_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_menu_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_menu_groups

CREATE TABLE config_schema.tb_menu_groups (
	id integer DEFAULT nextval('config_schema.tb_menu_groups_id_seq'::regclass) NOT NULL,
	group_id varchar(100) NOT NULL,
	group_code varchar(100) NOT NULL,
	group_name varchar(255) NOT NULL,
	description text,
	application_id integer,
	display_order integer DEFAULT 0,
	is_visible boolean DEFAULT true,
	icon_path varchar(255),
	permission_codes jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_menu_groups_group_id_key UNIQUE (group_id),
	CONSTRAINT tb_menu_groups_pkey PRIMARY KEY (id),
	CONSTRAINT tb_menu_groups_application_id_fkey FOREIGN KEY (application_id) REFERENCES config_schema.tb_application_mst(id) ON DELETE CASCADE
);
CREATE INDEX idx_menu_group_application ON config_schema.tb_menu_groups USING btree (application_id);
CREATE INDEX idx_menu_group_order ON config_schema.tb_menu_groups USING btree (display_order);
CREATE INDEX idx_menu_group_visible ON config_schema.tb_menu_groups USING btree (is_visible);
