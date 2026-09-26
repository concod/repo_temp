--liquibase formatted sql
--changeset liquibase:raja.duraisamy:oms_constraints_lead_time_update3 stripComments:false splitStatements:false context:Release_1_0 labels:VS-284
--comment: oms_constraints_lead_time update

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_lead_time (
	article varchar(50) NOT NULL,
	loc_code varchar(255) NOT NULL,
	vendor_name varchar(50) NULL,
	po_to_order_processing int4 NULL,
	lead_time int4 NULL,
	mode_shipment varchar(50) NOT NULL,
	default_mode int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar(50) NULL,
	fabric_lt int4 DEFAULT 0 NULL,
	id serial4 NOT NULL,
	column_updated varchar NULL,
	from_date date NULL,
	to_date date NULL,
	manufacturing_lead_time int4 NULL,
	qc_time int4 NULL,
	CONSTRAINT pk_oms_constraints_lead_time PRIMARY KEY (article, loc_code, channel, mode_shipment)
);

--changeset liquibase:kanishka.parashar:oms_constraints_lead_time_id_logic_fix stripComments:false splitStatements:false context:MTP-113840 labels:MTP-113840
--comment: oms_constraints_lead_time_id_fix
ALTER TABLE inventory_smart.oms_constraints_lead_time 
ALTER COLUMN id DROP DEFAULT;