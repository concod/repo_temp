--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:constraint_master stripComments:false splitStatements:false context:Release_1_0 labels:sm_constraint_master
--comment: initial changeset for constraint_master

CREATE TABLE if NOT exists inventory_smart.constraint_master (
	mapping_code int4 NULL,
	l0_name varchar NULL,
	channel varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 DEFAULT 0 NOT NULL,
	max_stock float4 DEFAULT 0 NOT NULL,
	aps float4 NULL,
	ros float4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	upload_flag varchar DEFAULT false NOT NULL,
	CONSTRAINT constraint_master_un_fk UNIQUE (mapping_code, l0_name),
	CONSTRAINT constraint_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT constraint_master_fk FOREIGN KEY (mapping_code,l0_name) REFERENCES "global".product_mapping_product_store(mapping_code,l0_name) ON DELETE SET NULL,
	CONSTRAINT constraint_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT constraint_master_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT constraint_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX constraint_master_l0 ON inventory_smart.constraint_master USING btree (l0_name);
CREATE INDEX constraint_master_max_stock_idx ON inventory_smart.constraint_master USING btree (max_stock);
CREATE INDEX constraint_master_min_stock_idx ON inventory_smart.constraint_master USING btree (min_stock);
CREATE INDEX constraint_master_product_code_idx ON inventory_smart.constraint_master USING btree (product_code, store_code);
CREATE INDEX constraint_master_wos_idx ON inventory_smart.constraint_master USING btree (wos);


--changeset ashish@impactanalytics.co:drop_bad_index stripComments:false splitStatements:false context:Release_1_0 labels:sm_constraint_master
--comment: initial changeset for constraint_master
DROP INDEX IF EXISTS inventory_smart.constraint_master_max_stock_idx;
DROP INDEX IF EXISTS inventory_smart.constraint_master_min_stock_idx;
DROP INDEX IF EXISTS inventory_smart.constraint_master_wos_idx;
