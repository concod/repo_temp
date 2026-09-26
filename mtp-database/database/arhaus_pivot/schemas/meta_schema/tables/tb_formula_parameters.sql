--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_formula_parameters stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_formula_parameters
CREATE TABLE meta_schema.tb_formula_parameters (
	id serial4 NOT NULL,
	formula_id int4 NOT NULL,
	parameters varchar(50) NOT NULL,
	mandatory bool NULL,
	"sequences" int4 NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_formula_parameters_unique UNIQUE (id)
);