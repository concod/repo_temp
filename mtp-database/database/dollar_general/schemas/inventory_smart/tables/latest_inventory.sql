--liquibase formatted sql
--changeset liquibase:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for latest_inventory
CREATE TABLE inventory_smart.latest_inventory (
	product_code varchar NOT NULL,
	primary_sku varchar not null,
	l0_code varchar not null,
	l0_name varchar not null,
	store_code varchar NOT NULL,
	store_type varchar,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	inv_date date,
	CONSTRAINT latest_inventory_un UNIQUE (product_code, store_code, l0_code)
);
ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
CREATE INDEX latest_inventory_product_code_idx ON inventory_smart.latest_inventory USING btree (product_code);


--changeset swapnil.bhange-4:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:0070
--comment: added new column in latest_inventory
ALTER TABLE inventory_smart.latest_inventory ADD COLUMN channel VARCHAR;

--changeset swapnil.bhange-5:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:0071
--comment: added dc_code column in latest_inventory
ALTER TABLE inventory_smart.latest_inventory ADD COLUMN dc_code INT4;

ALTER TABLE inventory_smart.latest_inventory DROP CONSTRAINT IF EXISTS latest_inventory_un;

ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_un_1 UNIQUE (product_code, store_code, l0_code, dc_code);

ALTER TABLE inventory_smart.latest_inventory ADD CONSTRAINT latest_inventory_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;


--changeset swapnil.bhange-6:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:0072
--comment: changed dtatype for oh, oo, it columns in latest_inventory
ALTER TABLE inventory_smart.latest_inventory ALTER COLUMN oh TYPE int8;
ALTER TABLE inventory_smart.latest_inventory ALTER COLUMN it TYPE int8;
ALTER TABLE inventory_smart.latest_inventory ALTER COLUMN oo TYPE int8;

--changeset swapnil.bhange-7:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:0073
--comment: changed dtatype for oh, oo, it to int4columns in latest_inventory
ALTER TABLE inventory_smart.latest_inventory ALTER COLUMN oh TYPE INT4;
ALTER TABLE inventory_smart.latest_inventory ALTER COLUMN it TYPE INT4;
ALTER TABLE inventory_smart.latest_inventory ALTER COLUMN oo TYPE INT4;


--changeset linu.nazil:latest_inventory_dc_code_idx stripComments:false splitStatements:false context:Release_1_0 labels:0073
--comment: adding index on dc_code
CREATE INDEX IF NOT EXISTS latest_inventory_dc_code_idx ON inventory_smart.latest_inventory USING btree (dc_code);