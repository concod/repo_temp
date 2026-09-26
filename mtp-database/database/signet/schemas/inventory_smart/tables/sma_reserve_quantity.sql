--liquibase formatted sql
--changeset liquibase:sma_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sma_reserve_quantity
CREATE TABLE inventory_smart.sma_reserve_quantity (
	product_code varchar NOT NULL,
	sma_percentage int4 NOT NULL,
	CONSTRAINT sma_reserve_quantity_pk PRIMARY KEY (product_code)
);