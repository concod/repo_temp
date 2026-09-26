--liquibase formatted sql
--changeset swapnil.bhange:alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 labels:0001
--comment: initial changeset for alerts_product_store_level
CREATE TABLE inventory_smart.alerts_product_store_level (
	primary_sku varchar NULL,
	store_code varchar NULL,
	l0_code varchar NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	product_description varchar NULL,
	article varchar NULL,
	set_week varchar NULL,
	store_attribute varchar NULL,
	store_group_description varchar NULL,
	store_name varchar NULL,
	state varchar NULL,
	psme_rule_code int4 NULL,
	psme_exception_start_date date NULL,
	psme_exception_end_date date NULL,
	psme_created_at timestamptz NULL,
	psme_updated_at timestamptz NULL,
	psme_created_by int4 NULL,
	psme_updated_by int4 NULL,
	product_store_mapping_exceptions int4 NULL
);

--changeset swapnil.bhange-2:alerts_product_store_level_v3 stripComments:false splitStatements:false context:Release_1_0 labels:alerts-3
--comment: added one new column for alerts_product_store_level 
alter table inventory_smart.alerts_product_store_level add column if not exists rule_code_store_code varchar null;

