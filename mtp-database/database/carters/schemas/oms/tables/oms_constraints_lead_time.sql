--liquibase formatted sql
--changeset liquibase:oms_constraints_lead_time_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_constraints_lead_time_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_lead_time (
	article varchar(50) NOT NULL,
	loc_code varchar(50) DEFAULT '-'::character varying NOT NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar(50) NOT NULL,
	vendor_name varchar(50) NULL,
	shipping_lead_time int4 NULL,
	po_to_order_processing int4 NULL,
	mode_shipment varchar(50) NULL,
	manufacturing_lead_time int4 NULL,
	fabric_lt int4 NULL,
	default_mode varchar(50) NULL,
	lead_time int4 NULL,
	from_date date NULL,
	to_date date NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(50) NULL,
	id serial4 NOT NULL,
	qc_time int4 NULL,
	CONSTRAINT pk_oms_constraints_lead_time PRIMARY KEY (article, loc_code, channel, vendor_code)
);