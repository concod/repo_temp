--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:preallocate_to_new_stores_alert stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for preallocate_to_new_stores_alert

CREATE TABLE inventory_smart.preallocate_to_new_stores_alert (
	store_code varchar NOT NULL,
	store_name varchar NULL,
	region int4 NULL,
	country varchar NULL,
	district varchar NULL,
	city varchar NULL,
	opening_date date NULL,
	reservation_date date NULL,
	creation_date date NULL,
	count_of_choices int4 NULL,
	forecast_over_target_wos int4 NULL,
	oh_dc int4 NULL,
	CONSTRAINT preallocate_to_new_stores_alert_un UNIQUE (store_code),
	CONSTRAINT preallocate_to_new_stores_alert_ph_code_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);


--changeset kamuju.mahaveer@impactanalytics.co:preallocate_to_new_stores_alert_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert RENAME COLUMN country to s1_name ;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert RENAME COLUMN district TO s3_name ;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert RENAME COLUMN city TO s4_name ;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert RENAME COLUMN region TO location_hierarchy_region_code ;


--changeset kamuju.mahaveer@impactanalytics.co:preallocate_to_new_stores_alert_v2 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-132
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert  ADD pns_is_resolved int4 DEFAULT 0 NULL;

--changeset anujkumar.singh@impactanalytics.co:preallocate_to_new_stores_alert_v3 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-132
--comment: Updating Schema based on Alignment with product team
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert DROP COLUMN IF EXISTS creation_date;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert DROP COLUMN IF EXISTS count_of_choices;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert DROP COLUMN IF EXISTS forecast_over_target_wos;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert DROP COLUMN IF EXISTS oh_dc;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert DROP COLUMN IF EXISTS pns_is_resolved;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS total_sku_count int4 NULL;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS approved_sku_count int4 NULL;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS released_sku_count int4 NULL;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS approval_needed varchar NULL;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS release_needed varchar NULL;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS new_store_reserve_flag int4 NULL;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS nsr_is_resolved int4 NULL;
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ADD COLUMN IF NOT EXISTS channel varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:preallocate_to_new_stores_alert_v4 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-493
--comment: Updating Schema based on Alignment with product team
ALTER TABLE inventory_smart.preallocate_to_new_stores_alert ALTER COLUMN location_hierarchy_region_code TYPE varchar USING location_hierarchy_region_code::varchar;

