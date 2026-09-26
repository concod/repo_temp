--liquibase formatted sql
--changeset liquibase:dc_transit_time_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_transit_time_validated_table

-- DROP TABLE IF EXISTS global.dc_transit_time_validated_table;
CREATE TABLE global.dc_transit_time_validated_table (
	dc_code varchar NOT NULL,
	store_code varchar NOT NULL,
	lead_time int4 NULL,
	processing_time int4 NULL,
	transit_time int4 NULL,
	channel varchar NULL,
	updated_at varchar NULL,
	updated_by int4 NULL,
	priority int4 NULL,
	CONSTRAINT dc_transit_time_validated_pk PRIMARY KEY (dc_code, store_code)
);