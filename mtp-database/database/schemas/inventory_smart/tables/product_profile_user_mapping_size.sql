--liquibase formatted sql
--changeset adesh:product_profile_user_mapping_size_v3 stripComments:false splitStatements:false context:MTP-70709 labels:MTP-70709
--comment: MTP-70709-user-mapping-size-table-for-user-defined-pp
CREATE TABLE IF NOT EXISTS inventory_smart.product_profile_user_mapping_size (
	pp_code int4 NOT NULL,
	l0_name varchar NULL,
	size_level_proportion float4 NOT NULL,
	overall_proportion float4 NOT NULL,
	size varchar NOT NULL,
	store_code varchar NOT NULL,
	CONSTRAINT pp_size_store_un UNIQUE (pp_code, size, store_code),
	CONSTRAINT product_profile_mapping_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE,
	CONSTRAINT product_profile_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset adesh:product_profile_user_mapping_size-indexing_v3 stripComments:false splitStatements:false context:MTP-75045 labels:MTP-75045
--comment: MTP-75045-indexing-for-user-defined-pp
CREATE INDEX IF NOT EXISTS idx_pum_pp_code ON inventory_smart.product_profile_user_mapping_size(pp_code);
CREATE INDEX IF NOT EXISTS idx_pum_store_code ON inventory_smart.product_profile_user_mapping_size(store_code);
CREATE INDEX IF NOT EXISTS idx_pum_size ON inventory_smart.product_profile_user_mapping_size(size);