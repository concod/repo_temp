--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:expired_store_3 stripComments:false splitStatements:false context:MTP-67427 labels:MTP-67427
--comment: initial changeset for expired_stores
CREATE TABLE IF NOT EXISTS "global".expired_stores (
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS expired_stores_path_level_idx ON global.expired_stores USING btree (path, level);