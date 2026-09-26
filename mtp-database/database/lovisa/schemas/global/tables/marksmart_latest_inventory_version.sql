    --liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_latest_inventory_version_v2 stripComments:false splitStatements:false context:marksmart_latest_inventory_version
    --comment: initial changeset for marksmart_latest_inventory_version_v2

CREATE TABLE IF NOT EXISTS "global".marksmart_latest_inventory_version (
	version_code int4 NOT NULL,
	store_code text NULL,
	store_id int4 NOT NULL,
	product_code text NULL,
	product_id int4 NOT NULL,
	"date" date NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	total_inventory int4 NULL,
	age int4 NULL,
	clearance_indicator int4 NULL,
	clearance_eligible int4 NULL,
	vendor_oo int4 NULL,
	style_cuq text NULL,
	lifecycle_indicator text NULL,
	st float4 NULL,
	store_grade varchar NULL,
	store_grade_id int4 NULL,
	dc_oh int4 NULL,
	dc_it int4 NULL,
	dc_oo int4 NULL,
	CONSTRAINT marks_latest_inventory_version_pk_1 PRIMARY KEY (version_code, product_id, store_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX marksmart_inventory_master_l0_id_idx_4 ON global.marksmart_latest_inventory_version USING btree (version_code, product_id, store_id);
