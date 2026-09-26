--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart_hierarchy_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:pricesmart_hierarchy_mapping_1


CREATE TABLE pricesmart.pricesmart_hierarchy_mapping (
	id_mapping int4 NOT NULL,
	is_product_hierarchy bool DEFAULT true NOT NULL,
	request_key varchar NOT NULL,
	id_column varchar NOT NULL,
	value_column varchar NOT NULL,
	is_attribute bool DEFAULT true NULL,
	CONSTRAINT pricesmart_hierarchy_mapping_unique UNIQUE (id_mapping, request_key, is_product_hierarchy)
);
