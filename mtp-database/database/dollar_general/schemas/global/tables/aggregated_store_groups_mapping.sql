--liquibase formatted sql
--changeset swapnil.bhange:store_groups stripComments:false splitStatements:false context:Release_1_0 labels:014
--comment: initial changeset for aggregated_store_groups_mapping

CREATE TABLE "global".aggregated_store_groups_mapping (
	sg_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	store_count int4 NOT NULL
);


-- "global".aggregated_store_groups_mapping foreign keys

ALTER TABLE "global".aggregated_store_groups_mapping ADD CONSTRAINT aggregated_store_groups_mapping_fk FOREIGN KEY (sg_code) REFERENCES "global".store_groups(sg_code) ON DELETE CASCADE;


--changeset swapnil.bhange-2:agg_store_groups stripComments:false splitStatements:false context:Release_1_0 labels:015
--comment: added unique key constraint for aggregated_store_groups_mapping

ALTER TABLE "global".aggregated_store_groups_mapping ADD CONSTRAINT aggregated_store_groups_mapping_un_1 UNIQUE (sg_code, psa_code);

--changeset rishitha.gangadhara-2:agg_store_groups_2 stripComments:false splitStatements:false context:Release_1_0 labels:015
--comment: added unique key constraint for aggregated_store_groups_mapping_2
ALTER TABLE "global".aggregated_store_groups_mapping ADD CONSTRAINT aggregated_store_groups_mapping_pk PRIMARY KEY (sg_code, psa_code);
