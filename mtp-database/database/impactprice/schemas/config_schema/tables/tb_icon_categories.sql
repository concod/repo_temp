--liquibase formatted sql
--changeset liquibase:tb_icon_categories_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_icon_categories_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_icon_categories_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_icon_categories stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_icon_categories

CREATE TABLE config_schema.tb_icon_categories (
	id integer DEFAULT nextval('config_schema.tb_icon_categories_id_seq'::regclass) NOT NULL,
	category_key varchar(100) NOT NULL,
	label varchar(255) NOT NULL,
	description text,
	icon_type varchar(20) DEFAULT 'mixed'::character varying,
	sort_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	created_by varchar(255),
	updated_by varchar(255),
	CONSTRAINT tb_icon_categories_category_key_key UNIQUE (category_key),
	CONSTRAINT tb_icon_categories_pkey PRIMARY KEY (id)
);
