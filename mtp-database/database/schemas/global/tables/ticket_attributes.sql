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

--changeset kamalesh.k@impactanalytics.co:ticket_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for ticket_attributes

ALTER TABLE "global".ticket_attributes
DROP CONSTRAINT IF EXISTS ticket_attributes_un;

ALTER TABLE "global".ticket_attributes
ADD CONSTRAINT ticket_attributes_pkey PRIMARY KEY (id, attribute_name);