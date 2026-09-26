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
	store_code varchar NOT NULL
)
PARTITION BY LIST (l0_name);
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_un UNIQUE (pp_code, l0_name, product_code, store_code);

--changeset liquibase:product_profile_mapping_ps_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_mapping_ps_idx
CREATE INDEX product_profile_mapping_ps_code_idx ON inventory_smart.product_profile_mapping (product_code,store_code);
