-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_product_attribute_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_product_attribute

CREATE TABLE  size_smart.tb_product_attribute (
	id serial4 NOT NULL,
	subcategory varchar NOT NULL,
	internal_name varchar NOT NULL,
	global_fit_platform varchar NOT NULL,
	is_selected bool DEFAULT true NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	upc_ean varchar NULL,
	stretch_type_nm varchar NULL,
	color_finish_des varchar NULL,
	leg_opening_nm varchar NULL,
	season_nm varchar NULL,
	product_family varchar NULL,
	sleeve_length_nm varchar NULL,
	product_price_positioning varchar NULL,
	demographic_name varchar NULL,
	consumer_seg_nm varchar NULL,
	waist_rise_nm varchar NULL,
	neckline_nm varchar NULL,
	CONSTRAINT tb_product_attribute_id_key UNIQUE (id),
	CONSTRAINT tb_product_attribute_pkey PRIMARY KEY (subcategory, internal_name, global_fit_platform)
);
CREATE UNIQUE INDEX  unique_hierarchy_idx 
ON size_smart.tb_product_attribute USING btree (subcategory, internal_name, global_fit_platform, is_selected);