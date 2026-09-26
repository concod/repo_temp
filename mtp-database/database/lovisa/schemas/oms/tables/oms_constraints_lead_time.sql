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

--changeset swapnil.bhange-2:oms_constraints_lead_time_column_typ_correction_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding changing default mode datatype
ALTER TABLE inventory_smart.oms_constraints_lead_time ALTER COLUMN default_mode TYPE bool USING (default_mode::integer != 0);
ALTER TABLE inventory_smart.oms_constraints_lead_time ADD COLUMN IF NOT EXISTS shipping_lead_time int4 NULL;
ALTER TABLE inventory_smart.oms_constraints_lead_time ADD COLUMN IF NOT EXISTS variance int4 DEFAULT 0 NULL;

--changeset sreenivas.s@impactanalytics.co:oms_constraints_lead_time_column_type_correction_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing default mode datatype
ALTER TABLE inventory_smart.oms_constraints_lead_time ALTER COLUMN default_mode TYPE INT4 USING CASE WHEN default_mode THEN 1 ELSE 0 END;