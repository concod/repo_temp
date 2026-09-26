-- liquibase formatted sql
-- changeset liquibase:product_profile_mapping_signet stripComments:false splitStatements:false context:MTP-50208 labels:MTP-50208
-- comment: product_profile_mapping
CREATE TABLE IF NOT EXISTS inventory_smart.product_profile_mapping (
	pp_code int4 NOT NULL,
	mapping_code int4 NULL,
	l0_name varchar NULL,
	size_level_proportion float4 NOT NULL,
	overall_proportion float4 NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	CONSTRAINT product_profile_mapping_un UNIQUE (pp_code, mapping_code, l0_name),
    CONSTRAINT product_profile_mapping_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE,
CONSTRAINT product_profile_mapping_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
CONSTRAINT product_profile_mapping_psm_fk FOREIGN KEY (mapping_code,l0_name) REFERENCES "global".product_mapping_product_store(mapping_code,l0_name) ON DELETE SET NULL,
CONSTRAINT product_profile_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE TABLE if not exists inventory_smart.product_profile_mapping_default PARTITION OF inventory_smart.product_profile_mapping (
	CONSTRAINT product_profile_mapping_default_un UNIQUE (pp_code, product_code, store_code)
) DEFAULT;

--changeset liquibase:product_profile_mapping_ps_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_mapping_ps_idx
CREATE INDEX IF NOT EXISTS product_profile_mapping_ps_code_idx ON inventory_smart.product_profile_mapping (product_code,store_code);

--changeset liquibase:create unique constraint stripComments:false splitStatements:false context:MTP-50208 labels:MTP-50208
--comment: create unique constraint
ALTER TABLE inventory_smart.product_profile_mapping DROP CONSTRAINT product_profile_mapping_un;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT pp_store_uni_idx UNIQUE (pp_code, store_code, l0_name, product_code);
