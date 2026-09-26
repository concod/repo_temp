--liquibase formatted sql
--changeset swapnil.bhange:store_unit_capacity_v2 stripComments:false splitStatements:false context:store_capacity_version
--comment: initial changeset for store_unit_capacity_v2

CREATE TABLE IF NOT EXISTS inventory_smart.store_unit_capacity_version (
	version_code int4 NOT NULL,
	l0_name varchar NOT NULL,
	store_code varchar NOT NULL,
	range_name varchar NOT NULL,
	fixture varchar NOT NULL,
	l1_name varchar NOT NULL,
	prong_count int4 NULL,
	CONSTRAINT store_unit_capacity_version_un PRIMARY KEY (version_code, store_code, range_name, l1_name),
	CONSTRAINT store_unit_capacity_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset swapnil.bhange:store_unit_capacity_v3 stripComments:false splitStatements:false context:store_capacity_version
--comment: initial changeset for store_unit_capacity_v3
ALTER TABLE inventory_smart.store_unit_capacity_version RENAME COLUMN prong_count TO unit_capacity;