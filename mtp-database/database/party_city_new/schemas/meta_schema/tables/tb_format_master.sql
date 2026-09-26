--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_format_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_format_master

CREATE TABLE meta_schema.tb_format_master (
	id int4 NOT NULL,
	formatter jsonb NOT NULL,
	remarks varchar(200) NULL,
	"name" varchar(30) NULL,
	CONSTRAINT pk_format_master_id PRIMARY KEY (id),
	CONSTRAINT tb_kpi_format_id_key UNIQUE (id)
);