--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:client_attribute_mapping stripComments:false splitStatements:false context:Release_1_0 labels:MTP-38338
--comment: initial changeset for client_attribute_mapping

CREATE TABLE forecast_smart.client_attribute_mapping (
	client varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL
);