--liquibase formatted sql
--changeset liquibase:intermediate_delta_inventory stripComments:false splitStatements:false context:MTP-17787 labels:MTP-17787
--comment: initial changeset for intermediate_delta_inventory
CREATE TABLE inventory_smart.intermediate_delta_inventory (
	store_code varchar NOT NULL,
	product_code varchar NOT NULL,
	oh float4 NULL,
	origin_source varchar NULL,
	created_date timestamptz NOT NULL,
	process_date timestamptz NULL,
	status varchar NULL,
	batch_no varchar NULL,
	ats_qty int4 NULL,
	unallocated_qty float4 NULL,
	CONSTRAINT intermediate_delta_inventory_un UNIQUE (product_code, store_code)
);
--changeset adeshkumar:intermediate_delta_inventory stripComments:false splitStatements:false context:MTP-17787 labels:MTP-17787
--comment: removing unique constraint on product_code and store-code
ALTER TABLE inventory_smart.intermediate_delta_inventory DROP CONSTRAINT intermediate_delta_inventory_un;

--changeset liquibase:drop_columns_from_intermediate_delta_inventory stripComments:false splitStatements:false context:MTP-57622 labels:MTP-57622
--comment: drop specified columns from intermediate_delta_inventory
ALTER TABLE inventory_smart.intermediate_delta_inventory
DROP COLUMN store_code,
DROP COLUMN product_code,
DROP COLUMN oh,
DROP COLUMN origin_source,
DROP COLUMN created_date,
DROP COLUMN process_date,
DROP COLUMN status,
DROP COLUMN batch_no,
DROP COLUMN ats_qty,
DROP COLUMN unallocated_qty;

--changeset liquibase:add_columns_from_intermediate_delta_inventory stripComments:false splitStatements:false context:MTP-57622 labels:MTP-57622
--comment: add specified columns from intermediate_delta_inventory
ALTER TABLE inventory_smart.intermediate_delta_inventory
ADD COLUMN brand varchar(50) NOT NULL,
ADD COLUMN channelid int4 NOT NULL,
ADD COLUMN product_code varchar(50) NULL,
ADD COLUMN store_code varchar(10) NULL,
ADD COLUMN created_date timestamp NOT NULL,
ADD COLUMN oh int4 NULL,
ADD COLUMN it int4 NULL,
ADD COLUMN oo int4 NULL,
ADD COLUMN wip int4 NULL;

--changeset kamuju.mahaveer:intermediate_delta_inventory_v1 stripComments:false splitStatements:false context:MTP-17787 labels:VS-273
--comment: Adding updated at column with default val
ALTER TABLE inventory_smart.intermediate_delta_inventory ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT (now() AT TIME ZONE 'America/New_York'::text) NOT NULL;

--changeset kamuju.mahaveer:intermediate_delta_inventory_v2 stripComments:false splitStatements:false context:MTP-17787 labels:VS-273
--comment: fixing updated at column with default val
ALTER TABLE inventory_smart.intermediate_delta_inventory  ALTER COLUMN updated_at SET DEFAULT now();

