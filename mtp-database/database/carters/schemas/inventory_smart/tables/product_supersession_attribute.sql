--liquibase formatted sql
--changeset liquibase:product_supersession_attribute stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_supersession_attribute
CREATE TABLE inventory_smart.product_supersession_attribute (
	ps_code int4 NOT NULL,
	attribute_name varchar NULL,
	attribute_value varchar NULL,
	CONSTRAINT product_supersession_attribute_ps_code_fkey FOREIGN KEY (ps_code) REFERENCES inventory_smart.product_supersession_mapping(ps_code)
);