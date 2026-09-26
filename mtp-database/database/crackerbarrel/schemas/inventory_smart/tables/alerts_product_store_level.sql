--liquibase formatted sql
--changeset liquibase:alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_product_store_level

CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_store_level (
	article text NULL,
	store_code text NULL,
	pack_id text NULL,
	oh_pack_qty float8 NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	s0_name text NULL,
	s1_name text NULL,
	channel text NULL,
	product_description text NULL,
	dc_flag bool NULL,
	excs_flg int8 NULL,
	shrtfl_flg int8 NULL,
	stckout_flg int8 NULL,
	excess int8 NULL,
	shortfall int8 NULL,
	stockout int8 NULL,
	normal int8 NULL,
	oh float8 NULL,
	it float8 NULL,
	oo float8 NULL,
	lw_units float8 NULL,
	lw_revenue float8 NULL,
	lw_margin float8 NULL,
	promo_percentage float8 NULL,
	wos float8 NULL,
	size_integrity float8 NULL,
	week_to_date_sales float8 NULL,
	last_day_sales float8 NULL,
	oh_dc float8 NULL,
	sales_1_ago float8 NULL,
	sales_2_ago float8 NULL,
	sales_3_ago float8 NULL,
	sales_4_ago float8 NULL,
	sales_5_ago float8 NULL,
	sales_6_ago float8 NULL,
	sales_7_ago float8 NULL,
	sales_8_ago float8 NULL,
	aur float8 NULL,
	clearance_alert_flag int8 NULL,
	newly_launched_alert_flag int8 NULL,
	retirement_alert_flag int8 NULL
);

--changeset kaustubh.gupta:colum addition in alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 labels:cols_add
--comment: added l0_name column
ALTER TABLE inventory_smart.alerts_product_store_level
ADD COLUMN l0_name varchar;


--changeset kaustubh.gupta:colums_modify_alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 labels:colums_modify
--comment: colums_modify
alter table inventory_smart.alerts_product_store_level add column if not exists primary_trait_desc varchar;
alter table inventory_smart.alerts_product_store_level drop column if exists promo_percentage;
alter table inventory_smart.alerts_product_store_level drop column if exists week_to_date_sales;
alter table inventory_smart.alerts_product_store_level drop column if exists last_day_sales;
alter table inventory_smart.alerts_product_store_level drop column if exists oh_dc;
alter table inventory_smart.alerts_product_store_level drop column if exists sales_1_ago;
alter table inventory_smart.alerts_product_store_level drop column if exists sales_2_ago;
alter table inventory_smart.alerts_product_store_level drop column if exists sales_3_ago;
alter table inventory_smart.alerts_product_store_level drop column if exists sales_4_ago;
alter table inventory_smart.alerts_product_store_level drop column if exists sales_5_ago;
alter table inventory_smart.alerts_product_store_level drop column if exists sales_6_ago;
alter table inventory_smart.alerts_product_store_level drop column if exists sales_7_ago;
alter table inventory_smart.alerts_product_store_level drop column if exists sales_8_ago;
alter table inventory_smart.alerts_product_store_level drop column if exists aur;

--changeset kaustubh.gupta:colums_modify_alerts_product_store_level_v2 stripComments:false splitStatements:false context:Release_1_0 labels:colums_modify_v2
--comment: colums_modify_v2
alter table inventory_smart.alerts_product_store_level drop column if exists pack_id;
alter table inventory_smart.alerts_product_store_level drop column if exists oh_pack_qty;
alter table inventory_smart.alerts_product_store_level drop column if exists wos;
alter table inventory_smart.alerts_product_store_level add column if not exists tot_inv float;
alter table inventory_smart.alerts_product_store_level add column if not exists promo_percentage float;
alter table inventory_smart.alerts_product_store_level add column if not exists wos_oh float;
alter table inventory_smart.alerts_product_store_level add column if not exists wos_oh_it float;
alter table inventory_smart.alerts_product_store_level add column if not exists wos_oh_oo_it float;

--changeset kaustubh.gupta:cb_changes_alerts_flag stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:cb_changes_alerts_flag
--comment: cb_changes_alerts_flag
ALTER TABLE inventory_smart.alerts_product_store_level 
ADD COLUMN IF NOT EXISTS stockout_is_resolved INT;

ALTER TABLE inventory_smart.alerts_product_store_level 
ADD COLUMN IF NOT EXISTS shortfall_is_resolved INT;

ALTER TABLE inventory_smart.alerts_product_store_level 
ADD COLUMN IF NOT EXISTS overstock_is_resolved INT;

--changeset kaustubh.gupta:cb_changes_alerts_store_level_cols stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:cb_changes_alerts_store_level_cols
--comment: cb_changes_alerts_store_level_cols
ALTER TABLE inventory_smart.alerts_product_store_level DROP COLUMN s0_name;
ALTER TABLE inventory_smart.alerts_product_store_level DROP COLUMN s1_name;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS store_name VARCHAR;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS region VARCHAR;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS state VARCHAR;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS district VARCHAR;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS store_attribute_1 VARCHAR;

--changeset aman.lakkoju:product_type_item_status columns added stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:cb_changes_alerts_store_level_cols
--comment: product_type_item_status columns added

ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS item_status varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS product_type varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS uda_value_desc _varchar NULL;