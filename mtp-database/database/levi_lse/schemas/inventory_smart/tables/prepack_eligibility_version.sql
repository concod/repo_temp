--liquibase formatted sql
--changeset himansh.bhardwaj:prepack_eligibility_version_v2 stripComments:false splitStatements:false context: AA labels:schema 
--comment: updated changeset for prepack_eligibility_version with missing columns

CREATE TABLE inventory_smart.prepack_eligibility_version (
    version_code int4 NOT NULL,
    l0_name varchar NOT NULL,
    l1_name varchar NOT NULL,
    article varchar NOT NULL,
    on_floor_date DATE NULL,
    store_code varchar NOT NULL,
    eligible_packs varchar NULL,
    allocation_type varchar NULL,
    selling_fiscal_weeks int4 NULL,
    last_allocated DATE NULL, 
    CONSTRAINT prepack_eligibility_version_pk PRIMARY KEY (version_code, article, store_code, eligible_packs)
)
PARTITION BY LIST (version_code);

ALTER TABLE inventory_smart.prepack_eligibility_version ADD CONSTRAINT prepack_eligibility_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

--changeset himansh.bhardwaj:changing_pk stripComments:false splitStatements:false context: AA labels:schema 
--comment: changing_pk
ALTER TABLE inventory_smart.prepack_eligibility_version DROP CONSTRAINT prepack_eligibility_version_pk;
ALTER TABLE inventory_smart.prepack_eligibility_version ADD CONSTRAINT prepack_eligibility_version_pk PRIMARY KEY (version_code, article, store_code);

--changeset himansh.bhardwaj:drop_not_null_elig_packs stripComments:false splitStatements:false context: AA labels:schema 
--comment: drop_not_null_elig_packs
ALTER TABLE inventory_smart.prepack_eligibility_version 
ALTER COLUMN eligible_packs DROP NOT NULL;