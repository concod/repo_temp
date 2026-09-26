--liquibase formatted sql
--changeset himansh.bhardwaj:new_store_data_version stripComments:false splitStatements:false context:GENERICNEWSTORE labels:generic-newstore
--comment: initial changeset for new_store_data_version

CREATE TABLE "global".new_store_data_version (
    version_code int4 NOT NULL,
    store_code varchar NOT NULL,
    store_name varchar NULL,
    CONSTRAINT new_store_data_version_pk PRIMARY KEY (version_code, store_code)
)
PARTITION BY LIST (version_code);

-- global.new_store_data_version foreign keys

ALTER TABLE "global".new_store_data_version ADD CONSTRAINT new_store_data_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;