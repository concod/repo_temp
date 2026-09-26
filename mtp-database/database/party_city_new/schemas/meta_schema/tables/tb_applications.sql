--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_applications stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_applications

CREATE TABLE meta_schema.tb_applications (
	id serial4 NOT NULL,
	"name" varchar(30) NOT NULL,
	application_type int4 NULL,
	is_active bool DEFAULT true NULL,
	schema_id int4 NULL,
	app_icon text NULL,
	theme varchar(50) NULL,
	remarks varchar(200) NULL,
	is_deleted bool DEFAULT false NULL,
	CONSTRAINT tb_applications_id_key UNIQUE (id),
	CONSTRAINT tb_applications_pkey PRIMARY KEY (name)
);


-- meta_schema.tb_applications foreign keys

ALTER TABLE meta_schema.tb_applications ADD CONSTRAINT fk_schemamst FOREIGN KEY (schema_id) REFERENCES meta_schema.tb_db_schemamst(id);