--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:ticket_attributes stripComments:false splitStatements:false context:MTP-22854 labels:liquibase_project_start
--comment: creating table ticket_attributes
CREATE TABLE "global".ticket_attributes (
	id int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NULL,
	CONSTRAINT ticket_attributes_un UNIQUE (id, attribute_name),
	CONSTRAINT ticket_attributes_fk FOREIGN KEY (id) REFERENCES "global".ticket_master(id) ON DELETE CASCADE
);