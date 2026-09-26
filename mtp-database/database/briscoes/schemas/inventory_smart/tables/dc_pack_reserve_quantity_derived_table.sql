--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:dc_pack_reserve_quantity_derived_table stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:dc_pack_reserve_quantity_derived_table
--comment: initial changeset for dc_pack_reserve_quantity_derived_table
CREATE TABLE if not exists inventory_smart.dc_pack_reserve_quantity_derived_table (
	article varchar NOT NULL,
	"date" date NOT NULL,
	quantity numeric null,
	product_code varchar NOT null,
	size varchar null,
	dc_code int4 null,
	CONSTRAINT dc_pack_reserve_quantity_derived_table_pk PRIMARY KEY (product_code, "date",dc_code)
);


--changeset samridhi.gupta@impactanalytics.co:column_add_oms_dc_split_ratio stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:column_add_dc_split_ratio
--comment: column_add_dc_split_ratio
alter table inventory_smart.dc_pack_reserve_quantity_derived_table rename column quantity to reserve_quantity;


