--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_latest_inventory_version_20251216 stripComments:false splitStatements:false context:Release_1_0 labels:tb_latest_inventory
--comment: Create tb_latest_inventory_version table

CREATE TABLE IF NOT EXISTS "global".tb_latest_inventory_version (
	s0_id int4 NULL,
	s0_name varchar(50) NULL,
	s1_id int4 NULL,
	s1_name varchar(50) NULL,
	store_id int4 NOT NULL,
	style_cuq varchar(50) NULL,
	product_id int4 NOT NULL,
	clearance_indicator int4 NULL,
	"date" date NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	vendor_oo int4 NULL,
	dc_oh int4 NULL,
	dc_it int4 NULL,
	dc_oo int4 NULL,
	total_inventory int4 NULL,
	clearance_indicator_rf int4 NULL,
	lifecycle_indicator_rf text NULL,
	st float8 NULL,
	age int4 NULL,
	clearance_eligible int4 NULL,
	version_code int4 NOT NULL,
	CONSTRAINT tb_latest_inventory_version_pk PRIMARY KEY (store_id, product_id, version_code)
)
PARTITION BY LIST (version_code);
CREATE INDEX idx_tb_latest_inventory_version_date ON global.tb_latest_inventory_version USING btree (date);
CREATE INDEX idx_tb_latest_inventory_version_store_product ON global.tb_latest_inventory_version USING btree (store_id, product_id);

--changeset sreevathsa.sp:tb_latest_inventory_version_alter_style_cuq_20251217 stripComments:false splitStatements:false context:Release_1_0 labels:tb_latest_inventory_alter
--comment: Alter style_cuq column from varchar(50) to varchar
--rollback: ALTER TABLE "global".tb_latest_inventory_version ALTER COLUMN style_cuq TYPE varchar(50);

ALTER TABLE "global".tb_latest_inventory_version ALTER COLUMN style_cuq TYPE varchar;
