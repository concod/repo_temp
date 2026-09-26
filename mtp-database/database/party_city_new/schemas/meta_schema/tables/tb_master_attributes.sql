--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_master_attributes stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_master_attributes

CREATE TABLE meta_schema.tb_master_attributes (
	id serial4 NOT NULL,
	"name" varchar(50) NOT NULL,
	"label" varchar(50) NULL,
	parent_id numeric NULL,
	remarks varchar(200) NULL,
	order_sequence int4 NULL,
	is_active bool NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	is_deleted bool DEFAULT false NULL,
	contains_child bool DEFAULT false NULL,
	CONSTRAINT tb_master_attributes_id_key UNIQUE (id),
	CONSTRAINT tb_master_attributes_pkey PRIMARY KEY (name)
);