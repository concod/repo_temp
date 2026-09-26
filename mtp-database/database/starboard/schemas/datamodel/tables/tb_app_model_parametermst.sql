--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_app_model_parametermst stripComments:false splitStatements:false context:Release_1_0 labels:tb_app_model_parametermst1
--comment: initial changeset for tb_app_model_parametermst
CREATE TABLE datamodel.tb_app_model_parametermst (
	id serial4 NOT NULL,
	parameter_name varchar(40) NOT NULL,
	data_type varchar(30) NOT NULL,
	formate varchar(20) NOT NULL,
	"default" varchar(500) NULL,
	validation_id int4 NULL,
	description varchar(200) NULL,
	CONSTRAINT paramter_id_uk UNIQUE (id),
	CONSTRAINT tb_app_model_parametermst_pk PRIMARY KEY (parameter_name, data_type, formate)
);


-- datamodel.tb_app_model_parametermst foreign keys

ALTER TABLE datamodel.tb_app_model_parametermst ADD CONSTRAINT validation_id_fk FOREIGN KEY (validation_id) REFERENCES datamodel.tb_app_validationrulesmst(id);