--liquibase formatted sql
--changeset liquibase:tb_icon_assets_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_icon_assets_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_icon_assets_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_icon_assets stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_icon_assets

CREATE TABLE config_schema.tb_icon_assets (
	id integer DEFAULT nextval('config_schema.tb_icon_assets_id_seq'::regclass) NOT NULL,
	icon_key varchar(200) NOT NULL,
	label varchar(255) NOT NULL,
	category_key varchar(100) NOT NULL,
	icon_type varchar(10) NOT NULL,
	mime_type varchar(50) NOT NULL,
	file_data bytea NOT NULL,
	file_size_bytes integer NOT NULL,
	tags text[] DEFAULT '{}'::text[],
	default_size integer DEFAULT 24,
	default_color varchar(20),
	default_bg varchar(20),
	default_border varchar(100),
	default_radius varchar(20),
	default_padding integer DEFAULT 0,
	default_opacity integer DEFAULT 100,
	default_shadow varchar(10) DEFAULT 'none'::character varying,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	created_by varchar(255),
	updated_by varchar(255),
	CONSTRAINT tb_icon_assets_icon_key_key UNIQUE (icon_key),
	CONSTRAINT tb_icon_assets_pkey PRIMARY KEY (id),
	CONSTRAINT tb_icon_assets_category_key_fkey FOREIGN KEY (category_key) REFERENCES config_schema.tb_icon_categories(category_key)
);
