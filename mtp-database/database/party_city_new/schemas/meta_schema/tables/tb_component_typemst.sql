--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_component_typemst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_component_typemst

CREATE TABLE meta_schema.tb_component_typemst (
	id serial4 NOT NULL,
	component_type varchar(30) NOT NULL,
	is_active bool DEFAULT true NULL,
	tech_stack varchar(50) NOT NULL,
	remarks varchar(200) NULL,
	is_deleted bool DEFAULT false NULL,
	CONSTRAINT tb_component_typemst_id_key UNIQUE (id),
	CONSTRAINT tb_component_typemst_pkey PRIMARY KEY (component_type, tech_stack)
);