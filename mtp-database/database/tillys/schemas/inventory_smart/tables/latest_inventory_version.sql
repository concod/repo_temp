--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:latest_inventory_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for latest_inventory_version

CREATE TABLE if not exists inventory_smart.latest_inventory_version (
	version_code int4 NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	"date" date NOT NULL,
	channel varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	CONSTRAINT latest_inventory_version_un UNIQUE (version_code, product_code, store_code),
	CONSTRAINT latest_inventory_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE,
	CONSTRAINT latest_inventory_version_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT latest_inventory_version_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset nischay.p@impactanalytics.co:latest_inventory_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_v2
--comment: alter table changeset for latest_inventory_version_v2
alter table inventory_smart.latest_inventory_version add column if not exists allocatable_qty float;
