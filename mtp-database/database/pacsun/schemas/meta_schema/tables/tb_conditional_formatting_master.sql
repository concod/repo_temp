--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_conditional_formatting_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_conditional_formatting_master
CREATE TABLE meta_schema.tb_conditional_formatting_master (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	condition_formatting text NULL,
	remark varchar(200) NULL,
	CONSTRAINT tb_conditional_formatting_master_id_key UNIQUE (id),
	CONSTRAINT tb_conditional_formatting_master_pkey PRIMARY KEY (name)
);