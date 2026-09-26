--liquibase formatted sql
--changeset liquibase:oms_constraints_lead_times_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for oms_constraints_lead_times

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_lead_time (
	id integer NULL,
	article varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	po_to_order_processing integer NULL,
	lead_time integer NULL,
	shipping_lead_time integer NULL,
	manufacturing_lead_time integer NULL,
	mode_shipment varchar NULL,
	default_mode varchar NULL,
	from_date date NULL,
	to_date date NULL,
	created_by integer NULL,
	created_at timestamptz NULL,
	updated_by integer NULL,
	updated_at timestamptz NULL,
	fabric_lt integer NULL,
	qc_time integer NULL,
	CONSTRAINT pk_oms_constraints_lead_time PRIMARY KEY (article, loc_code)
);

CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_constraints_lead_time_new_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
    
ALTER TABLE inventory_smart.oms_constraints_lead_time
ALTER COLUMN id SET DEFAULT nextval('inventory_smart.oms_constraints_lead_time_new_id_seq'::regclass);


--changeset poojith.krishna:oms_constraints_lead_time_datatype stripComments:false splitStatements:false context:initial_release labels:add_columns
--comment: columns add in oms_constraints_lead_time

ALTER TABLE inventory_smart.oms_constraints_lead_time
ALTER COLUMN default_mode TYPE int4
USING default_mode::int4;