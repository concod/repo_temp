--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_componentsmst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_componentsmst

CREATE TABLE meta_schema.tb_componentsmst (
	id serial4 NOT NULL,
	"name" varchar(30) NOT NULL,
	is_active bool DEFAULT true NULL,
	component_type_id int4 NULL,
	remarks varchar(200) NULL,
	is_deleted bool DEFAULT false NULL,
	CONSTRAINT tb_componentsmst_id_key UNIQUE (id),
	CONSTRAINT tb_componentsmst_pkey PRIMARY KEY (name)
);