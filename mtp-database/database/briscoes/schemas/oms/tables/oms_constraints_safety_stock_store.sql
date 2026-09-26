--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:ocss_ stripComments:false splitStatements:false convarchar:Release_1_0 ignore:false labels:oocs_store
--comment: schema for oms_constraints_safety_stock_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_safety_stock_store (
	article varchar NULL,
	store_code varchar NULL,
	channel varchar NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	safety_stock_method varchar NULL,
	safety_stock_twos int4 NULL,
	demand_twos int4 NULL,
	service_level_pct int4 NULL,
	stock_units int4 NULL,
	inventory_hold int4 NULL,
	created_by int4 NULL,
	created_at timestamp NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	column_updated varchar NULL,
    CONSTRAINT pk_oms_constraints_safety_stock_store PRIMARY KEY (article, store_code, channel, vendor_code)
);

--changeset abhimanyu.sheoran@impactanalytics.co:col_addns stripComments:false splitStatements:false convarchar:Release_1_0 ignore:false labels:col_addns
--comment: col_add oms_constraints_safety_stock_store
ALTER TABLE inventory_smart.oms_constraints_safety_stock_store
ADD COLUMN id int4 null;

--changeset abhimanyu.sheoran@impactanalytics.co.co:seria4 dtype stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:seria4 dtype
--comment: changed seria4 dtype
ALTER TABLE inventory_smart.oms_constraints_safety_stock_store DROP COLUMN IF EXISTS id;
ALTER TABLE inventory_smart.oms_constraints_safety_stock_store ADD COLUMN IF NOT EXISTS id serial4;
ALTER TABLE inventory_smart.oms_constraints_safety_stock_store ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;

--changeset raja.duraisamy@impactanalytics.co.co:article_store_code_index stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:article_store_code_index
--comment: article_store_code_index added
CREATE INDEX oms_constraints_safety_stock_store_idx ON inventory_smart.oms_constraints_safety_stock_store (article, store_code);