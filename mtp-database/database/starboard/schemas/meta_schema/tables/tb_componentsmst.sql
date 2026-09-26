--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_componentsmst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_componentsmst
CREATE TABLE meta_schema.tb_componentsmst(
	id serial4 NOT NULL,
	"name" varchar(30) NOT NULL,
	is_active bool NULL DEFAULT true,
	component_type_id int4 NULL,
	remarks varchar(200) NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_componentsmst_id_key UNIQUE (id),
	CONSTRAINT tb_componentsmst_pkey PRIMARY KEY (name),
	CONSTRAINT fk_component_type FOREIGN KEY (component_type_id) REFERENCES meta_schema.tb_component_typemst(id)
);