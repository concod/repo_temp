--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_formulatype_mst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_formulatype_mst
CREATE TABLE meta_schema.tb_formulatype_mst (
	id serial4 NOT NULL,
	formula_type varchar(50) NOT NULL,
	remarks varchar(200) NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_formulatype_mst_id_key UNIQUE (id),
	CONSTRAINT tb_formulatype_mst_pkey PRIMARY KEY (formula_type)
);