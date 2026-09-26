--liquibase formatted sql
--changeset Shaik.Azmathulla:versioning stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: initial changeset for versioning

CREATE TABLE global.versioning
(
    version_code SERIAL PRIMARY KEY,
	tbl_name varchar NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    duration INTERVAL GENERATED ALWAYS AS (updated_at - created_at) STORED
);

--changeset ashish:versioning_deleted_at stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: versioning_deleted_at
ALTER TABLE "global"."versioning" ADD deleted_at timestamptz NULL;

--changeset kamalesh.k:versioning_new_tbl_column stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: adding versioning_new_tbl_column
ALTER TABLE global.versioning ADD COLUMN IF NOT EXISTS new_tbl_name VARCHAR NULL;
