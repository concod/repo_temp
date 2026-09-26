--liquibase formatted sql
--changeset liquibase:product_profile_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_attributes
CREATE TABLE inventory_smart.product_profile_attributes (
	pp_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT product_profile_attributes_un UNIQUE (pp_code, attribute_name)
);
ALTER TABLE inventory_smart.product_profile_attributes ADD CONSTRAINT ppa_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE;
