--liquibase formatted sql
--changeset liquibase:tb_menu_mst_menu_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_menu_mst_menu_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_menu_mst_menu_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_menu_mst stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_menu_mst

CREATE TABLE config_schema.tb_menu_mst (
	menu_id integer DEFAULT nextval('config_schema.tb_menu_mst_menu_id_seq'::regclass) NOT NULL,
	menu_code varchar(100) NOT NULL,
	menu_name varchar(255) NOT NULL,
	menu_description text,
	default_icon_path varchar(255),
	menu_category varchar(50),
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_menu_mst_menu_code_key UNIQUE (menu_code),
	CONSTRAINT tb_menu_mst_pkey PRIMARY KEY (menu_id)
);
CREATE INDEX idx_menu_code ON config_schema.tb_menu_mst USING btree (menu_code);
