--liquibase formatted sql
--changeset liquibase:event_attribute_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_attribute_mapping

CREATE TABLE price_promo.event_attribute_mapping (
	event_id int4 NOT NULL,
	attribute_id int4 NOT NULL,
	attribute_value text NULL,
	CONSTRAINT event_attribute_mapping_pk PRIMARY KEY (event_id, attribute_id)
);