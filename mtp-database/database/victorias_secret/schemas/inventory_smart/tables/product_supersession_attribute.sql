--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_supersession_attribute stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for product_supersession_attribute

CREATE TABLE inventory_smart.product_supersession_attribute (
	ps_code int4 NOT NULL,
	attribute_name varchar NULL,
	attribute_value varchar NULL,
	CONSTRAINT product_supersession_attribute_ps_code_fkey FOREIGN KEY (ps_code) REFERENCES inventory_smart.product_supersession_mapping(ps_code)
);

