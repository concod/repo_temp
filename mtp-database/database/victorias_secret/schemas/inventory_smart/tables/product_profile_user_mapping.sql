--liquibase formatted sql
--changeset liquibase:product_profile_user_mapping stripComments:false splitStatements:false context:MTP-MTP-37928 labels:MTP-37928
--comment: MTP-37928-user-mapping-table-for-user-defined-pp
CREATE TABLE inventory_smart.product_profile_user_mapping (
	pp_code int4 NOT NULL,
	l0_name varchar NULL,
	size_level_proportion float4 NOT NULL,
	overall_proportion float4 NOT NULL,
	product_unique_code varchar NOT NULL,
	store_code varchar NOT NULL,
	CONSTRAINT product_profile_mapping_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE,
	CONSTRAINT product_profile_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
--changeset adesh.kumar:product_profile_user_mapping stripComments:false splitStatements:false context:MTP-37928 labels:MTP-37928
--comment: MTP-37928-add-unique-constraint
ALTER TABLE inventory_smart.product_profile_user_mapping ADD CONSTRAINT pp_product_store_un UNIQUE (pp_code, product_unique_code, store_code);