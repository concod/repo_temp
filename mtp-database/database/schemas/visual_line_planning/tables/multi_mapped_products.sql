--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co:multi_mapped_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for multi_mapped_products
CREATE TABLE visual_line_planning.multi_mapped_products (
	line_plan_product_list_id uuid NOT NULL,
	mapped_id varchar(255) NOT NULL,
	a0_name text NULL,
	a1_name text NULL,
	a2_name text NULL,
	image_url text NULL,
	is_primary bool DEFAULT false NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	"source" varchar(255) NULL,
	CONSTRAINT multi_mapped_products_pkey PRIMARY KEY (line_plan_product_list_id, mapped_id)
);

--changeset shannonnelson.d@impactanalytics.co:add_is_locked_to_multi_mapped_products_20251104 stripComments:false splitStatements:false context:Release_2_0 labels:ddl
--comment: added is_locked to multi_mapped_products table
alter table visual_line_planning.multi_mapped_products 
add column is_locked bool default false;