--liquibase formatted sql
--changeset liquibase:constraint_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for constraint_master
CREATE TABLE inventory_smart.constraint_master (
	mapping_code int4 NULL,
	l0_name varchar NULL,
	channel varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 NOT NULL DEFAULT 0,
	max_stock float4 NOT NULL DEFAULT 0,
	aps float4 NULL,
	ros float4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	CONSTRAINT constraint_master_un_fk UNIQUE (mapping_code, l0_name)
)
PARTITION BY LIST (l0_name);
ALTER TABLE inventory_smart.constraint_master ADD CONSTRAINT constraint_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.constraint_master ADD CONSTRAINT constraint_master_fk FOREIGN KEY (mapping_code,l0_name) REFERENCES "global".product_mapping_product_store(mapping_code,l0_name) ON DELETE SET NULL;
ALTER TABLE inventory_smart.constraint_master ADD CONSTRAINT constraint_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.constraint_master ADD CONSTRAINT constraint_master_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.constraint_master ADD CONSTRAINT constraint_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
CREATE INDEX constraint_master_product_code_idx ON inventory_smart.constraint_master USING btree (product_code, store_code);
CREATE TABLE inventory_smart.constraint_master_default PARTITION OF inventory_smart.constraint_master (
	CONSTRAINT constraint_master_default_un UNIQUE (product_code, store_code)
) DEFAULT;


--changeset kailash.yadav@impactanalytics.co:constraint_master_l0_index stripComments:false splitStatements:false context:DAT-934 labels:constraint_master_l0_index
--comment: index created on partition column

CREATE INDEX if not exists constraint_master_l0 ON  inventory_smart.constraint_master USING btree (l0_name);

--changeset swapnil.bhange@impactanalytics.co:constraint_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21791
--comment: index created on partition column

ALTER TABLE inventory_smart.constraint_master ADD user_adjusted_forecast float4 NULL;