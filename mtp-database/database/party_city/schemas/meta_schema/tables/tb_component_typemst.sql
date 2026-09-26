--liquibase formatted sql
--changeset arvindar.prasad@impactanalytics.co:tb_component_typemst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39134
--comment: initial changeset for tb_component_typemst
CREATE TABLE meta_schema.tb_component_typemst (
	id serial4 NOT NULL,
	component_type varchar(30) NOT NULL,
	is_active bool NULL DEFAULT true,
	tech_stack varchar(50) NOT NULL,
	remarks varchar(200) NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_component_typemst_id_key UNIQUE (id),
	CONSTRAINT tb_component_typemst_pkey PRIMARY KEY (component_type, tech_stack)
);
