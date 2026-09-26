--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_attributes stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_attributes

CREATE TABLE base_pricing.bp_product_attributes (
	product_id int4 NOT NULL,
	base_cost float8 NULL,
	residential_price float8 NULL,
	"size" int4 NULL,
	uom text NULL,
	derived_size float8 NULL,
	derived_uom text NULL,
	launch_date date NULL,
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
	product_attribute_1 text NULL,
	product_attribute_2 bool NULL,
	product_attribute_3 text NULL,
	product_attribute_4 text NULL,
	product_attribute_5 text NULL,
	product_attribute_6 text NULL,
	product_attribute_7 text NULL,
	product_attribute_8 text NULL,
	product_attribute_9 text NULL,
	product_attribute_10 text NULL,
	size_curve text NULL,
	CONSTRAINT bp_product_attributes_pkey PRIMARY KEY (product_id)
);