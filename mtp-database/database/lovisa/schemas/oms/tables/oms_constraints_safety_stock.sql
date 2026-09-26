--liquibase formatted sql
--changeset liquibase:raja.duraisamy:oms_constraints_safety_stock_update3 stripComments:false splitStatements:false context:Release_1_0 labels:VS-284
--comment: initial changeset for oms_constraints_safety_stock_update3

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_safety_stock (
	article varchar(255) NOT NULL,
	loc_code varchar(255) NOT NULL,
	vendor_name varchar(255) NULL,
	safety_stock_method varchar(255) NULL,
	safety_stock_twos int4 NULL,
	service_level_pct int4 NULL,
	stock_units int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	vendor_code varchar(255) NOT NULL,
	demand_twos int4 NULL,
	id serial4 NOT NULL,
	channel varchar(255) NOT NULL,
	column_updated varchar NULL,
	CONSTRAINT pk_oms_constraints_safety_stock PRIMARY KEY (article, loc_code, channel, vendor_code)
);


--changeset swapnil.bhange_v2-5:oms_constraints_safety_stock stripComments:false splitStatements:false context:Release_1_0 labels:latest_inventory_version
--comment: initial changeset for oms_constraints_safety_stock_v2
ALTER TABLE inventory_smart.oms_po_master_version ADD COLUMN IF NOT EXISTS inventory_hold int4 NULL;

