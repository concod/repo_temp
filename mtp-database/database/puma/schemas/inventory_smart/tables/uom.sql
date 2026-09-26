--liquibase formatted sql
--changeset shekharkrishna.nirnakar@impactanalytics.com:uom stripComments:false splitStatements:false context:Release_1_0 labels:uom
--comment: initial changeset for uom


CREATE TABLE if not exists  inventory_smart.uom (
	from_unit_description varchar NULL,
	factor float4 NULL,
	to_unit_description varchar NULL,
	item_id varchar NOT NULL,
	from_unit varchar NULL,
	to_unit varchar NULL,
	"date" date NULL,
	CONSTRAINT uom_pk PRIMARY KEY (item_id)
);