--liquibase formatted sql
--changeset liquibase:product_profile_attribute stripComments:false splitStatements:false context:MTP-55972 labels: MTP-55972
--comment: MTP-55972
--rollback: SELECT 1

--  DROP TABLE IF EXISTS inventory_smart.product_profile_attribute;

CREATE TABLE if NOT exists inventory_smart.product_profile_attributes (
	pp_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT product_profile_attributes_un UNIQUE (pp_code, attribute_name),
	CONSTRAINT ppa_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE
);