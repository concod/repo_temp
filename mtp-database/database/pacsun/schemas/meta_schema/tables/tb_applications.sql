--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_applications stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_applications
CREATE TABLE meta_schema.tb_applications (
	id serial4 NOT NULL,
	"name" varchar(30) NOT NULL,
	application_type int4 NULL,
	is_active bool NULL DEFAULT true,
	schema_id int4 NULL,
	app_icon text NULL,
	theme varchar(50) NULL,
	remarks varchar(200) NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_applications_id_key UNIQUE (id),
	CONSTRAINT tb_applications_pkey PRIMARY KEY (name),
	CONSTRAINT fk_schemamst FOREIGN KEY (schema_id) REFERENCES meta_schema.tb_db_schemamst(id)
);

