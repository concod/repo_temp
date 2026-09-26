--liquibase formatted sql
--changeset liquibase:oms_shipment_modes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for oms_shipment_modes
CREATE TABLE IF NOT EXISTS oms.oms_shipment_modes (
	shipment_mode_id serial4 NOT NULL,
	shipment_mode varchar(255) NOT NULL,
	lead_time int4 NOT NULL,
	default_mode bool DEFAULT false NULL,
	extra json NULL,
	CONSTRAINT oms_shipment_modes_pkey PRIMARY KEY (shipment_mode_id)
);