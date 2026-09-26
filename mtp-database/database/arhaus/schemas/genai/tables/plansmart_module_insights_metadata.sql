--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:plansmart_module_insights_metadata_3  stripComments:false splitStatements:false context:Release_1_3 labels:MTP-73057
--comment: initial changeset for plansmart_module_insights_metadata 


CREATE TABLE IF NOT exists genai.plansmart_module_insights_metadata (
	module_name varchar(255) NOT NULL,
	backend_table_names_list jsonb NULL,
	ui_table_id jsonb NULL,
	redis_index jsonb NULL,
	sample_questions jsonb NULL,
	status bool DEFAULT true NOT NULL,
	CONSTRAINT plansmart_module_insights_metadata_pk PRIMARY KEY (module_name)
);