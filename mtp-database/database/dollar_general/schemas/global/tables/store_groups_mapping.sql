--liquibase formatted sql
--changeset swapnil.bhange:store_groups stripComments:false splitStatements:false context:Release_1_0 labels:014
--comment: initial changeset for store_groups_mapping

CREATE TABLE "global".store_groups_mapping (
	sg_code int4 NOT NULL,
	store_code varchar NOT NULL,
	ref_sg_code int4 NULL,
	psa_code text NULL,
	CONSTRAINT store_groups_mapping_un UNIQUE (sg_code, store_code)
);


-- "global".store_groups_mappin8g foreign keys

ALTER TABLE "global".store_groups_mapping ADD CONSTRAINT store_groups_mapping_fk FOREIGN KEY (psa_code,store_code) REFERENCES "global".product_store_attributes_filter(psa_code,store_code) ON DELETE CASCADE;

--changeset rishitha.gangadhara:store_groups_mapping_2 stripComments:false splitStatements:false context:Release_1_0 labels:014
--comment: initial changeset for store_groups_mapping_2
ALTER TABLE "global".store_groups_mapping ADD CONSTRAINT  store_groups_mapping_pk PRIMARY KEY (sg_code, store_code);
