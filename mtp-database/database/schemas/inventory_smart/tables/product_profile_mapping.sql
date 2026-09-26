--liquibase formatted sql
--changeset liquibase:product_profile_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_mapping
CREATE TABLE inventory_smart.product_profile_mapping (
	pp_code int4 NOT NULL,
	mapping_code int4 NULL,
	l0_name varchar NULL,
	size_level_proportion float4 NOT NULL,
	overall_proportion float4 NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	CONSTRAINT product_profile_mapping_un UNIQUE (pp_code, mapping_code, l0_name)
)
PARTITION BY LIST (l0_name);
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_psm_fk FOREIGN KEY (mapping_code,l0_name) REFERENCES "global".product_mapping_product_store(mapping_code,l0_name) ON DELETE SET NULL;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
CREATE TABLE inventory_smart.product_profile_mapping_default PARTITION OF inventory_smart.product_profile_mapping (
	CONSTRAINT product_profile_mapping_default_un UNIQUE (pp_code, product_code, store_code)
) DEFAULT;

--changeset liquibase:product_profile_mapping_ps_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_mapping_ps_idx
CREATE INDEX product_profile_mapping_ps_code_idx ON inventory_smart.product_profile_mapping (product_code,store_code);

--changeset aman.lakkoju:size_column_inclusion stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: size_column_inclusion
ALTER TABLE inventory_smart.product_profile_mapping 
ADD COLUMN IF NOT EXISTS size VARCHAR;
