--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:expired_store_3 stripComments:false splitStatements:false context:MTP-67427 labels:MTP-67427
--comment: initial changeset for expired_stores
CREATE TABLE IF NOT EXISTS "global".expired_stores (
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS expired_stores_path_level_idx ON global.expired_stores USING btree (path, level);

--changeset kamalesh.k:expired_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to expired_stores table

ALTER TABLE global.expired_stores
ADD COLUMN expired_store_code serial4,
ADD CONSTRAINT expired_stores_pkey PRIMARY KEY (expired_store_code);
