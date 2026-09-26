--liquibase formatted sql
--changeset ashish@impactanalytics.co:constraint_validity_master stripComments:false splitStatements:false context:Release_1_0 labels:constraint_validity_master
--comment: initial changeset for constraint_validity_master
CREATE TABLE inventory_smart.constraint_validity_master (
	mapping_code int4 NULL,
	l0_name varchar NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	validity daterange NOT NULL,
	channel varchar NOT NULL,
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
	user_adjusted_forecast float4 NULL
) PARTITION BY LIST (l0_name);

ALTER TABLE inventory_smart.constraint_validity_master ADD CONSTRAINT constraint_validity_master_fk FOREIGN KEY (mapping_code, l0_name) REFERENCES global.product_mapping_product_store(mapping_code, l0_name) ON DELETE SET NULL;
ALTER TABLE inventory_smart.constraint_validity_master ADD CONSTRAINT constraint_validity_master_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.constraint_validity_master ADD CONSTRAINT constraint_validity_master_product_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.constraint_validity_master ADD CONSTRAINT constraint_validity_master_store_fk FOREIGN KEY (store_code) REFERENCES global.store_master(store_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.constraint_validity_master ADD CONSTRAINT constraint_validity_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;

-- CREATE INDEX constraint_validity_master_l0_name ON inventory_smart.constraint_validity_master USING btree (l0_name);

/*
--  Migration Script
do $$
begin
perform public.parellel_insert('WITH rows AS (
	INSERT INTO inventory_smart.constraint_validity_master
	(mapping_code, l0_name, product_code, store_code, validity, channel, wos, transit_time, safety_stock, min_stock, max_stock, 
	aps, ros, created_at, updated_at, updated_by, created_by, user_adjusted_forecast)
	select mapping_code,
	l0_name,
	product_code,
	store_code,
	daterange(
	  current_date, ''2050-12-31''::date
	) as validity,
	channel,
	wos,
	transit_time,
	safety_stock,
	min_stock,
	max_stock,
	aps,
	ros,
	created_at,
	updated_at,
	updated_by,
	created_by,
	user_adjusted_forecast from inventory_smart.constraint_master {where} RETURNING 1
) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 100, 'inventory_smart.constraint_master', 'store_code', 'paid_store_idx2');
 end; $$
*/

--changeset linu.nazil@impactanalytics.co:constraint_validity_master_index stripComments:false splitStatements:false context:Release_1_0 labels:constraint_validity_master
--comment: initial changeset for constraint_validity_master new index
CREATE INDEX constraint_lsp_idx
ON inventory_smart.constraint_validity_master(l0_name, store_code, product_code)
WHERE mapping_code is not null;

--changeset ashish@impactanalytics.co:constraint_validity_master_hash_index stripComments:false splitStatements:false context:Release_1_0 labels:constraint_validity_master
--comment: initial changeset for constraint_validity_master_hash_index
DROP INDEX if exists inventory_smart.constraint_lsp_idx;
CREATE INDEX constraint_lsp_idx ON inventory_smart.constraint_validity_master USING hash (md5(l0_name || store_code || product_code));
