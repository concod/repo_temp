--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_formula_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_formula_master
CREATE TABLE meta_schema.tb_formula_master (
	id serial NOT NULL,
	"name" varchar(50) NOT NULL,
	formula text NULL,
	function_name varchar(50) NOT NULL,
	remarks varchar(200) NULL,
	is_deleted bool NOT NULL DEFAULT false,
	"Remarks " varchar(50) NULL,
	CONSTRAINT tb_formula_master_id_key UNIQUE (id),
	CONSTRAINT tb_formula_master_pkey PRIMARY KEY (name)
);

