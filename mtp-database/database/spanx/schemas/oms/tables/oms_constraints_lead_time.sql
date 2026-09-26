--liquibase formatted sql
--changeset liquibase:oms_constraints_lead_time stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_lead_time

CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_constraints_lead_time_new_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_lead_time (
	id int4 DEFAULT nextval('inventory_smart.oms_constraints_lead_time_new_id_seq'::regclass) NULL,
	article varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	po_to_order_processing int4 NULL,
	lead_time int4 NULL,
	shipping_lead_time int4 NULL,
	manufacturing_lead_time int4 NULL,
	mode_shipment varchar NULL,
	default_mode varchar NULL,
	from_date date NULL,
	to_date date NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	fabric_lt int4 NULL,
	qc_time int4 NULL,
	CONSTRAINT pk_oms_constraints_lead_time PRIMARY KEY (article, loc_code)
);

--changeset liquibase:oms_constraints_lead_time_dtype_ccc stripComments:false splitStatements:false context:Release_1_0 labels:dtype_chh
--comment: dtpe change for oms_constraints_lead_time
ALTER TABLE inventory_smart.oms_constraints_lead_time ALTER COLUMN default_mode TYPE int4 USING default_mode::int4;
