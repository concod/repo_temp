--liquibase formatted sql
--changeset liquibase:user_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_attributes
CREATE TABLE global.user_attributes (
    user_code integer NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying NOT NULL,
    datatype character varying DEFAULT 'varchar'::character varying NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE global.user_attributes
    ADD CONSTRAINT user_attributes_fk FOREIGN KEY (user_code) REFERENCES global.user_master(user_code) ON DELETE CASCADE;
ALTER TABLE "global".user_attributes ADD CONSTRAINT user_attributes_un UNIQUE (user_code,attribute_name);


--changeset kamaleshwaran.k@impactanalytics.co:user_attributes_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.user_attributes 
ADD CONSTRAINT user_attributes_pk 
PRIMARY KEY (user_code, attribute_name);

ALTER TABLE global.user_attributes 
DROP CONSTRAINT user_attributes_un;