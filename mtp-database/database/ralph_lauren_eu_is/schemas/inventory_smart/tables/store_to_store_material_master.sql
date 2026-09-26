--liquibase formatted sql
--changeset kuldeep.rathore@impactanalytics.co:store_to_store_material_list_eu_is_test stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.store_to_store_material_list_eu_is_test

-- DROP TABLE inventory_smart.store_to_store_material_master;

CREATE TABLE if not exists inventory_smart.store_to_store_material_master (
	article varchar NOT NULL,
	channel varchar NOT NULL,
	product_description varchar NULL,
	style_color_id varchar NULL,
	ax_structure varchar NULL,
	ax_label varchar NULL,
	ax_class varchar NULL,
	ax_merch_division varchar NULL,
	ax_subclass varchar NULL,
	brand varchar NULL,
	gm_perc float8 NULL,
	aur float8 NULL,
	CONSTRAINT store_to_store_material_master_pkey PRIMARY KEY (article, channel)
);