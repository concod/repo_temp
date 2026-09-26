--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_app_model_action_mapping stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_app_model_action_mapping

CREATE TABLE datamodel.tb_app_model_action_mapping (
	model_id int4 NOT NULL,
	action_id int4 NOT NULL
);


-- datamodel.tb_app_model_action_mapping foreign keys

ALTER TABLE datamodel.tb_app_model_action_mapping ADD CONSTRAINT action_id_fk FOREIGN KEY (action_id) REFERENCES datamodel.tb_app_pre_post_actionsmst(id);
ALTER TABLE datamodel.tb_app_model_action_mapping ADD CONSTRAINT model_id_fk FOREIGN KEY (model_id) REFERENCES datamodel.tb_app_modelmst(id);