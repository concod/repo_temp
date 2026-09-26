--liquibase formatted sql
--changeset liquibase:alerts_product_level stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_product_level

CREATE TABLE IF NOT EXISTS inventory_smart.asn_to_allocate_alert (
	asn_id text NULL,
	article text NULL,
	primary_trait_desc text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	product_description text NULL,
	product_type text NULL,
	oh float8 NULL,
	oo float8 NULL,
	it float8 NULL,
	asn_qty float8 NULL,
	sizes_count int8 NULL,
	oh_dc float8 NULL,
	forecast_over_target_wos float8 NULL,
	instore_date date NULL,
	delivery_date date NULL,
	store_count_asn int8 NULL,
	store_count_article int8 NULL,
	article_type text NULL,
CONSTRAINT asn_to_allocate_alert_un PRIMARY KEY (article, asn_id)
);
--changeset laraib.ahmad:cb_changes_alerts_flag stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:cb_changes_alerts_flag
--comment: added constarint
ALTER TABLE inventory_smart.asn_to_allocate_alert ALTER COLUMN asn_id SET NOT NULL;
ALTER TABLE inventory_smart.asn_to_allocate_alert ALTER COLUMN article SET NOT NULL;