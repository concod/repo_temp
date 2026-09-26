--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_configurator_config stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_configurator_config

CREATE TABLE meta_schema.tb_configurator_config (
	id serial4 NOT NULL,
	model_id int4 NOT NULL,
	"name" varchar(50) NOT NULL,
	"label" varchar(100) NULL,
	data_type_id int4 NULL,
	is_editable bool NULL,
	is_active bool NOT NULL,
	control_type_id_on_edit int4 NULL,
	is_visible bool DEFAULT true NULL,
	order_sequence int4 NULL
);