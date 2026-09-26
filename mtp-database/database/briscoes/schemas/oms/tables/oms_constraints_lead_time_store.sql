--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:oolt_sto stripComments:false splitStatements:false convarchar:Release_1_0 ignore:false labels:oolt_store
--comment: schema for oms_constraints_lead_time_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_lead_time_store (
	article varchar NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	store_code varchar NULL,
	channel varchar NULL,
	po_to_order_processing int4 NULL,
	lead_time int4 NULL,
	shipping_lead_time int4 NULL,
	qc_time int4 NULL,
	mode_shipment varchar NULL,
	default_mode int4 NULL,
	variance int4 NULL,
	fabric_lt int4 NULL,
	manufacturing_lead_time int4 NULL,
	from_date date NULL,
	to_date date NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar NULL,
	category varchar NULL,
    CONSTRAINT pk_oms_constraints_lead_time_store PRIMARY KEY (article, store_code, channel, vendor_code)
);

--changeset abhimanyu.sheoran@impactanalytics.co:col_add stripComments:false splitStatements:false convarchar:Release_1_0 ignore:false labels:col_add
--comment: col_add oms_constraints_lead_time_store
ALTER TABLE inventory_smart.oms_constraints_lead_time_store
ADD COLUMN id int4 null;

--changeset abhimanyu.sheoran@impactanalytics.co.co:seria4 dtype ch stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:seria4 dtype ch
--comment: changed seria4 dtype ch
ALTER TABLE inventory_smart.oms_constraints_safety_stock_store DROP COLUMN IF EXISTS id;
ALTER TABLE inventory_smart.oms_constraints_safety_stock_store ADD COLUMN IF NOT EXISTS id serial4;


--changeset raja.duraisamy@impactanalytics.co.co:oms_constraints_lead_time_store_index stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_constraints_lead_time_store_index
--comment: oms_constraints_lead_time_store index added
CREATE INDEX oms_constraints_lead_time_store_idx ON inventory_smart.oms_constraints_lead_time_store (article, store_code);


--changeset kanishka.parashar@impactanalytics.co.co:oms_constraints_lead_time_store_columns_update stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_constraints_lead_time_store_index
--comment: oms_constraints_lead_time_store id column update
ALTER TABLE inventory_smart.oms_constraints_lead_time_store
DROP COLUMN  IF EXISTS id;

ALTER TABLE inventory_smart.oms_constraints_lead_time_store
ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;


--changeset mssprakash.yashwanth@impactanalytics.co:idx_oclt_store_article stripComments:false splitStatements:false context:MTP-135352 labels:MTP-135352
--comment: Created index on store_code and article columns
CREATE INDEX IF NOT EXISTS idx_oclt_store_article
ON inventory_smart.oms_constraints_lead_time_store (store_code, article);

--changeset mssprakash.yashwanth@impactanalytics.co:drop_idx_oclt_store_article stripComments:false splitStatements:false context:MTP-135352 labels:MTP-135352
--comment: Dropped index on article and store_code columns
DROP INDEX IF EXISTS oms_constraints_lead_time_store_idx;