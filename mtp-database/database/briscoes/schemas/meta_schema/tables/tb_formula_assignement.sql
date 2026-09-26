--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_formula_assignement stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_formula_assignement
CREATE TABLE meta_schema.tb_formula_assignement (
	id serial4 NOT NULL,
	column_id int4 NOT NULL,
	formula_assinged text NULL,
	refrence_table_id _int4 NULL,
	condition_in_ref_table text NULL,
	remarks varchar(200) NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_formula_assignement_id_key UNIQUE (id),
	CONSTRAINT tb_formula_assignement_pkey PRIMARY KEY (column_id),
	CONSTRAINT table_columns_mst_fk FOREIGN KEY (column_id) REFERENCES meta_schema.tb_table_columns_mst(id)
);