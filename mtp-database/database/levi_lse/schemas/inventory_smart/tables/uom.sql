--liquibase formatted sql
--changeset aniruddh:uom stripComments:false splitStatements:false context:version 1 labels:version 1
--comment: initial changeset for uom
CREATE TABLE IF NOT EXISTS inventory_smart.uom (
	from_unit_description varchar NULL,
    article varchar Null,
	factor float4 NULL,
	to_unit_description varchar NULL,
	item_id varchar NOT NULL,
	from_unit varchar NULL,
	to_unit varchar NULL,
	"date" date NULL,
	CONSTRAINT uom_pk PRIMARY KEY (item_id)
);