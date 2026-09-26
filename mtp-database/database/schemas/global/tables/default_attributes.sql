--liquibase formatted sql
--changeset liquibase:default_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for default_attributes
CREATE TABLE global.default_attributes (
    attributes_id serial4 NOT NULL,
    attribute_type character varying,
    attribute_value jsonb,
    application_code integer NOT NULL
);
ALTER TABLE global.default_attributes ADD CONSTRAINT default_attributes_fk FOREIGN KEY (application_code) REFERENCES global.application_master(application_code);

--changeset kamalesh.k@impactanalytics.co:default_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for default_attributes

ALTER TABLE global.default_attributes
ADD CONSTRAINT default_attributes_pkey PRIMARY KEY (attributes_id);