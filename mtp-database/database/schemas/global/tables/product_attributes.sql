--liquibase formatted sql
--changeset liquibase:product_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes
CREATE TABLE global.product_attributes (
    product_code character varying NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying NOT NULL,
    CONSTRAINT product_attributes_un UNIQUE (product_code, attribute_name)
)
PARTITION BY LIST (attribute_name);
ALTER TABLE global.product_attributes
    ADD CONSTRAINT product_attributes_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;


--changeset kamaleshwaran.k@impactanalytics.co:product_attributes_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.product_attributes 
ADD CONSTRAINT product_attributes_pk 
PRIMARY KEY (product_code, attribute_name);

ALTER TABLE global.product_attributes 
DROP CONSTRAINT product_attributes_un;