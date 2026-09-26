
--liquibase formatted sql
--changeset swapnil.bhange:default_store_grade_1 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21914
--comment: create table schema for default_store_grade
CREATE TABLE IF NOT EXISTS "global".default_store_grade (
    channel varchar not null,
    store_code varchar NOT null,
    grade varchar NOT null
);
-- "global".default_store_grade foreign key
ALTER TABLE "global".default_store_grade DROP CONSTRAINT IF EXISTS default_store_grade_fk;
ALTER TABLE "global".default_store_grade DROP CONSTRAINT IF EXISTS default_store_grade_un;
ALTER TABLE "global".default_store_grade ADD CONSTRAINT default_store_grade_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
ALTER TABLE "global".default_store_grade ADD CONSTRAINT default_store_grade_un UNIQUE (channel, store_code);

--changeset rishitha.gangadhara:default_store_grade_3_new stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21914
--comment: create table schema for default_store_grade_2
ALTER TABLE "global".default_store_grade DROP CONSTRAINT IF EXISTS default_store_grade_pk;
ALTER TABLE "global".default_store_grade ADD CONSTRAINT default_store_grade_pk PRIMARY KEY (store_code);