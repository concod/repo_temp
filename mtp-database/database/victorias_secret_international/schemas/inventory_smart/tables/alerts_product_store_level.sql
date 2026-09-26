--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:alerts_product_store stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_product_store
--comment: initial changeset for alerts_product_store_level intl1
CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_store_level (
	article text NULL,
	l7_name text NULL,
	color text NULL,
	l0_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	l6_name text NULL,
	subbrand_code_desc text NULL,
	collection text NULL,
	masterstyle_descr text NULL,
	product_lifecycle text NULL,
	flex_style text NULL,
	generic text NULL,
	sizes_mat text NULL,
	form text NULL,
	user_defined_1 text NULL,
	user_defined_2 text NULL,
	user_defined_3 text NULL,
	user_defined_4 text NULL,
	user_defined_5 text NULL,
	inventory_status text NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	total_inv float4 NULL,
	wip float4 NULL,
	r_site_oh float4 NULL,
	r_site_it float4 NULL,
	r_site_oo float4 NULL,
	r_site_total_inv float4 NULL,
	r_site_wip float4 NULL,
	lw_revenue float4 NULL,
	lw_sales float4 NULL,
	l4w_avg_sales float4 NULL,
	week_to_day_sales float4 NULL,
	forward_wos float4 NULL,
	node_forward_wos float4 NULL,
	size_integrity_oh float4 NULL,
	size_integrity_oh_oo_it float4 NULL,
	avg_target_wos float4 NULL,
	sizes_count varchar(50) NULL,
	min varchar(50) NULL,
	below_mins_ind varchar(50) NULL,
	oh_dc int4 NULL,
	oo_it_dc int4 NULL,
	store_code int4 NULL,
	store_name text NULL,
	channel text NULL,
	partner_group_name text NULL,
	regional_master_name text NULL,
	store_format_description text NULL,
	vsba_regional_dc_descr text NULL,
	region_name text NULL,
	s1_name text NULL,
	s3_name text NULL,
	s4_name text NULL,
	launch_date date NULL,
	launch_floorset text NULL,
	floorset_ship_date date NULL,
	floorset_start_date date NULL,
	floorset_end_date date NULL,
	last_allocation_date date NULL,
	store_count int4 NULL,
	outbount_nodes_count int4 NULL,
	stockout_and_shortfall_flag int4 NULL,
	below_mins_flag int4 NULL,
	upcoming_floorset_promised_flag int4 NULL,
	aur float4 NULL,
	excess int4 NULL,
	normal int4 NULL,
	stockout int4 NULL,
	shortfall int4 NULL,
	l_site_oh int4 NULL,
	l_site_oo int4 NULL,
	l_site_it int4 NULL,
	l_site_wip int4 NULL,
	l_site_total_inv int4 NULL
);

--changeset kanishka.parashar@impactanalytics.co:alerts_product_store_level_devv1_fix stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema v1
alter table inventory_smart.alerts_product_store_level add column if not exists cbm_is_resolved int4 null;
alter table inventory_smart.alerts_product_store_level add column if not exists sosf_is_resolved int4 NULL;
alter table inventory_smart.alerts_product_store_level add column if not exists pre_allocation_flag int4 NULL;
alter table inventory_smart.alerts_product_store_level add column if not exists pa_is_resolved int4 NULL;
alter table inventory_smart.alerts_product_store_level add column if not exists ufp_is_resolved int4 NULL;


--changeset kanishka.parashar@impactanalytics.co:alerts_product_store_level_devv2 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: correcting data type1
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN store_code TYPE varchar USING store_code::varchar;
ALTER TABLE inventory_smart.alerts_product_store_level 
ALTER COLUMN sizes_count TYPE int4 
USING floor(sizes_count::float8)::int4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN min TYPE float4 USING min::float4;
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN below_mins_ind TYPE int4 USING below_mins_ind::int4;

