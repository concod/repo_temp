--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_constraints_lead_time stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_constraints_lead_time
--comment: initial changeset for oms_constraints_lead_time

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_lead_time (
	article varchar(256) NOT NULL,
	loc_code varchar(256) DEFAULT 'none'::character varying NOT NULL,
	vendor_code varchar(256) NOT NULL,
	vendor_name varchar(256) NULL,
	po_to_order_processing int4 NULL,
	lead_time int4 NULL,
	shipping_lead_time int4 NULL,
	qc_time int4 NULL,
	mode_shipment varchar(256) NULL,
	default_mode varchar(256) NULL,
	from_date date NULL,
	to_date date NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(256) NULL,
	id serial4 NOT NULL,
	channel varchar NOT NULL,
	fabric_lt int4 NULL,
	variance int4 NULL,
	manufacturing_lead_time int4 NULL,
	CONSTRAINT pk_oms_constraints_lead_time PRIMARY KEY (article, loc_code, channel, vendor_code)
);


--changeset samarjit.mazumder@impactanalytics.co:drop_not_null_constraint stripComments:false splitStatements:false context:Release_1_0 labels:drop_not_null_constraint
--comment: drop_not_null_constraint
ALTER TABLE inventory_smart.oms_constraints_lead_time DROP COLUMN IF EXISTS default_mode;
ALTER TABLE inventory_smart.oms_constraints_lead_time ADD COLUMN IF NOT EXISTS default_mode INT4 NULL;

--changeset sriraj.varanasi@impactanalytics.co:category_column_added stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:column_add_oms_constraints_lead_time
--comment: category_column_added
ALTER TABLE inventory_smart.oms_constraints_lead_time ADD COLUMN IF NOT EXISTS category varchar NULL;