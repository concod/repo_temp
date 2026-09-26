--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:dc_pack_reserve_quantity_derived_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for dc_pack_reserve_quantity_derived_table

CREATE TABLE if not exists inventory_smart.dc_pack_reserve_quantity_derived_table (
	article varchar NOT NULL,
	"date" date NOT NULL,
	reserve_quantity numeric null,
	product_code varchar NOT null,
	size varchar null,
	dc_code int4 null,
	CONSTRAINT dc_pack_reserve_quantity_derived_table_pk PRIMARY KEY (product_code, "date",dc_code)
);
