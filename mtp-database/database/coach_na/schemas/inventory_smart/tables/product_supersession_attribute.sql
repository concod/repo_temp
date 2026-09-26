--liquibase formatted sql
--changeset adesh:product_supersession_attribute_v2 stripComments:false splitStatements:false context:MTP-88318 labels:MTP-88318
--comment: MTP-88318:initial changeset for product_supersession_attribute
CREATE TABLE   inventory_smart.product_supersession_attribute (
	ps_code int4 NOT NULL,
	attribute_name varchar NULL,
	attribute_value varchar NULL,
	CONSTRAINT product_supersession_attribute_ps_code_fkey FOREIGN KEY (ps_code) REFERENCES inventory_smart.product_supersession_mapping(ps_code)
);