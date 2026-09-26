--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:store_current_inventory stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_store_current_inventory
--comment: initial changeset for store_current_inventory

CREATE TABLE if not exists "inventory_smart".store_current_inventory (
	store_code varchar not NULL,
	total_inv float4 NULL,
	oh float4 NULL,
	it float4 null,
	CONSTRAINT store_current_inventory_pk PRIMARY KEY (store_code)
);
