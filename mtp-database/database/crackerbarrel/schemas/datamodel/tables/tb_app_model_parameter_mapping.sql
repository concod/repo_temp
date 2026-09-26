--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_app_model_parameter_mapping stripComments:false splitStatements:false context:Release_1_0 labels:tb_app_model_parameter_mapping1
--comment: initial changeset for tb_app_model_parameter_mapping
CREATE TABLE datamodel.tb_app_model_parameter_mapping (
	model_id int4 NULL,
	"Parameter_id" int4 NULL
);


-- datamodel.tb_app_model_parameter_mapping foreign keys
ALTER TABLE datamodel.tb_app_model_parameter_mapping ADD CONSTRAINT model_id_topara_fk FOREIGN KEY (model_id) REFERENCES datamodel.tb_app_modelmst(id);
ALTER TABLE datamodel.tb_app_model_parameter_mapping ADD CONSTRAINT parameter_id_fk FOREIGN KEY ("Parameter_id") REFERENCES datamodel.tb_app_model_parametermst(id);