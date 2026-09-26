--liquibase formatted sql
--changeset liquibase:store_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes
CREATE TABLE "global".store_attributes (
	store_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL
)
PARTITION BY LIST (attribute_name);
ALTER TABLE "global".store_attributes ADD CONSTRAINT store_attributes_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
ALTER TABLE "global".store_attributes ADD CONSTRAINT store_attributes_un UNIQUE (store_code, attribute_name);


--changeset kamaleshwaran.k@impactanalytics.co:store_attributes_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.store_attributes 
ADD CONSTRAINT store_attributes_pk 
PRIMARY KEY (store_code, attribute_name);

ALTER TABLE global.store_attributes 
DROP CONSTRAINT store_attributes_un;