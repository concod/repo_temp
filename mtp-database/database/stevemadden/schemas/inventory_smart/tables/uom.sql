--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:uom stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:uom_table
--comment: table creation for uom

CREATE TABLE if NOT exists  inventory_smart.uom (
	from_unit_description varchar NULL,
	factor float4 NULL,
	to_unit_description varchar NULL,
	item_id varchar NOT NULL,
	from_unit varchar NULL,
	to_unit varchar NULL,
	"date" date NULL,
	CONSTRAINT uom_pk PRIMARY KEY (item_id)
);
