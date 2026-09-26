--liquibase formatted sql
--changeset swapnil.bhange:product_profile_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_mapping l4_name addition

CREATE TABLE inventory_smart.product_profile_mapping (
	pp_code int4 NOT NULL,
	mapping_code int4 NULL,
	l0_name varchar NULL,
	size_level_proportion float4 NOT NULL,
	overall_proportion float4 NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
    l4_name varchar NULL,
	CONSTRAINT product_profile_mapping_un UNIQUE (l0_name, product_code, store_code)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_profile_mapping_ps_code_idx ON inventory_smart.product_profile_mapping USING btree (product_code, store_code);

-- inventory_smart.product_profile_mapping foreign keys

ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.product_profile_mapping ADD CONSTRAINT product_profile_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset swapnil.bhange-2:product_profile_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_mapping l4_name addition
ALTER TABLE inventory_smart.product_profile_mapping ADD COLUMN IF NOT EXISTS display_article varchar NULL;

