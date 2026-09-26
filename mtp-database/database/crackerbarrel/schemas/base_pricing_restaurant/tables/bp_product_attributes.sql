--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_product_attributes_11 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_attributes_11

DROP TABLE IF EXISTS base_pricing_restaurant.bp_product_attributes CASCADE;

CREATE TABLE base_pricing_restaurant.bp_product_attributes (
	product_id int4 NOT NULL,
	base_cost float4 NULL,
	residential_price float4 NULL,
	"size" int4 NULL,
	uom text NULL,
	derived_size int4 NULL,
	derived_uom text NULL,
	active bool NULL,
	is_usable bool NULL,
	line_group text NULL,
	size_family text NULL,
	size_class text NULL,
	brand_family text NULL,
	brand_class text NULL,
	custom_family_1 text NULL,
	custom_class_1 text NULL,
	pre_price bool NULL,
	addsub bool NULL,
	catering_flag bool NULL,
	guest_proxy_cnt int4 NULL,
	beverage_incidence_proxy_cnt int4 NULL,
	prior_pos_id text NULL,
	major_group_master_number int8 NULL,
	family_group_master_number int8 NULL,
	menu_item_id varchar NULL,
	product_code varchar NULL,
	CONSTRAINT bp_product_attributes_pkey PRIMARY KEY (product_id)
);

