--liquibase formatted sql
--changeset swapnil.bhange:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_data_version
-- DROP TABLE "global".new_store_data_version;

CREATE TABLE IF NOT EXISTS "global".new_store_data_version (
	version_code int4 NOT NULL,
	store_code varchar NULL,
	store_name varchar NULL,
    CONSTRAINT new_store_data_version_un PRIMARY KEY (version_code, store_code),
	CONSTRAINT new_store_data_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);