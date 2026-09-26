--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_app_modelmst stripComments:false splitStatements:false context:Release_1_0 labels:tb_app_modelmst
--comment: initial changeset for tb_app_modelmst

CREATE TABLE datamodel.tb_app_modelmst (
	id serial4 NOT NULL,
	model_name varchar(50) NOT NULL,
	pre_action_id int4 NULL,
	post_action_id int4 NULL,
	query_id int4 NOT NULL,
	parameter_mapping_id int4 NULL,
	model_type int4 NOT NULL,
	remarks text NULL,
	last_modified time NULL,
	db_connection_id int4 NULL,
	CONSTRAINT model_id_uk UNIQUE (id)
);
CREATE INDEX fki_fk_connection ON datamodel.tb_app_modelmst USING btree (db_connection_id);
CREATE INDEX fki_fk_quey_store ON datamodel.tb_app_modelmst USING btree (query_id);


-- datamodel.tb_app_modelmst foreign keys
ALTER TABLE datamodel.tb_app_modelmst ADD CONSTRAINT fk_connection FOREIGN KEY (db_connection_id) REFERENCES datamodel.tb_db_connection(id);
ALTER TABLE datamodel.tb_app_modelmst ADD CONSTRAINT fk_quey_store FOREIGN KEY (query_id) REFERENCES datamodel.tb_sql_query_store(id);
ALTER TABLE datamodel.tb_app_modelmst ADD CONSTRAINT model_type_fk FOREIGN KEY (model_type) REFERENCES datamodel.tb_app_modeltypemst(id);