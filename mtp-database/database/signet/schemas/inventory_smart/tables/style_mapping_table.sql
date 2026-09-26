--liquibase formatted sql
--changeset bikrant.gupta:style_mapping_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_mapping_table
CREATE TABLE inventory_smart.style_mapping_table (
	new_article varchar(50) NULL,
	new_product_code varchar(50) NULL,
	old_article varchar(50) NULL,
	old_product_code varchar(50) NULL,
	old_l0_name varchar(50) NULL,
	old_l1_name varchar(50) NULL,
	old_l2_name varchar(50) NULL,
	old_l3_name varchar(50) NULL,
	old_cvsc varchar(50) NULL,
	old_product_description text NULL,
	old_size varchar NULL,
	old_size_name varchar NULL,
	mapping_type varchar(50) NULL,
	priority int4 NULL,
	start_date date NULL,
    end_date date NULL,
	updated_at timestamp NULL,
	updated_by varchar(50) NULL,
	has_store_exception boolean default FALSE  NOT NULL
);