--liquibase formatted sql
--changeset anish.a@impactanalytics.co:article_status_tag_tillys stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for article_status_tag_tillys
-- inventory_smart.alerts_product_level_version definition

-- Drop table

-- DROP TABLE inventory_smart.alerts_product_level_version;

CREATE TABLE if not exists inventory_smart.alerts_product_level_version (
	version_code int4 NOT NULL,
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	channel varchar NOT NULL,
	excs_flg int4 NULL,
	shrtfl_flg int4 NULL,
	stckout_flg int4 NULL,
	excess int4 NULL,
	shortfall int4 NULL,
	stockout int4 NULL,
	normal int4 NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	lw_qty int4 NULL,
	lw_revenue numeric NULL,
	c float4 NULL,
	promo_percentage numeric NULL,
	wos float4 NULL,
	size_integrity int4 NULL,
	week_to_date_sales int4 NULL,
	last_day_sales int4 NULL,
	oh_dc float4 NULL,
	sales_1_ago int4 NULL,
	sales_2_ago int4 NULL,
	sales_3_ago int4 NULL,
	sales_4_ago int4 NULL,
	aur int4 NULL,
	clearance_alert_flg int4 NULL,
	newly_launched_alert_flg int4 NULL,
	number_of_allocations int4 NULL,
	wos_oh float4 NULL,
	wos_oh_it int4 NULL,
	tot_inv float4 NULL,
	launch_date date NULL,
	recent_deviation_flg int4 NULL,
	repeat_deviation_flg int4 NULL,
	new_deviation_flg int4 NULL,
	style_name varchar NULL,
	CONSTRAINT alerts_product_level_version_pk PRIMARY KEY (product_code, version_code),
	CONSTRAINT alerts_product_level_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE,
	CONSTRAINT alerts_product_level_version_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);
--changeset anish.a@impactanalytics.co:alerts_product_level_version2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts2
--comment: initial changeset for alerts_product_level_version2
ALTER TABLE inventory_smart.alerts_product_level_version
ADD COLUMN excs_is_resolved int4,
ADD COLUMN shrtfl_is_resolved int4,
ADD COLUMN stckout_is_resolved int4,
ADD COLUMN style_color_desc text,
ADD COLUMN color_id_name varchar,
ADD COLUMN price_status varchar,
ADD COLUMN vendor varchar,
ADD COLUMN brand varchar,
ADD COLUMN "comments" varchar,
ADD COLUMN silhouette varchar,
ADD COLUMN lw_margin float4,
ADD COLUMN lw_aur float4;