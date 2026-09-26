--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:aggregated_store_groups_mapping_table_removed_replace_command stripComments:false splitStatements:false context:Release_1_0 labels:MTP-37094
--comment: initial changeset for aggregated_store_groups_mapping
CREATE TABLE "global".aggregated_store_groups_mapping (
	sg_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	store_count int4 NOT NULL,
	CONSTRAINT aggregated_store_groups_mapping_fk FOREIGN KEY (sg_code) REFERENCES "global".store_groups(sg_code) ON DELETE CASCADE
);

--changeset arnab.nandy@impactanalytics.co:aggregated_store_groups_mapping_table_added_unique_key stripComments:false splitStatements:false context:MTP-41716 labels:MTP-41716
--comment: added unique key for for aggregated_store_groups_mapping
ALTER TABLE "global".aggregated_store_groups_mapping
ADD CONSTRAINT aggregated_store_groups_mapping_uk UNIQUE (sg_code, psa_code);

--changeset kamalesh.k@impactanalytics.co:aggregated_store_groups_mapping_table_added_unique_key stripComments:false splitStatements:false context:MTP-41716 labels:MTP-41716
--comment: adding primary key for aggregated_store_groups_mapping
ALTER TABLE "global".aggregated_store_groups_mapping
DROP CONSTRAINT IF EXISTS aggregated_store_groups_mapping_uk;

ALTER TABLE "global".aggregated_store_groups_mapping
ADD CONSTRAINT aggregated_store_groups_mapping_pkey PRIMARY KEY (sg_code, psa_code);
