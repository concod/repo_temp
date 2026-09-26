--liquibase formatted sql
--changeset swapnil.b:oms_product_hybrid_attributes_v1 stripComments:false splitStatements:false context:Release_1_0 labels:_version
--comment: initial changeset for oms_product_hybrid_attributes_v1

CREATE TABLE IF NOT EXISTS inventory_smart.oms_product_hybrid_attributes_version (
	version_code int4 NOT NULL,
	product_code varchar(50) NOT NULL,
	ordering varchar(50) NULL,
	replenishment_status varchar(50) NULL,
	last_changed_date DATE NULL,
	CONSTRAINT oms_product_hybrid_attributes_pk PRIMARY KEY (version_code, product_code)
) PARTITION BY LIST (version_code);

