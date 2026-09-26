-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_product_hierarchy_attribute_mst_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_product_hierarchy_attribute_mst

CREATE TABLE  size_smart.tb_product_hierarchy_attribute_mst (
	id serial4 NOT NULL,
	hierarchy_mst_id int4 NOT NULL,
	product_attribute_id int4 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_product_hierarchy_attribute_mst_id_key UNIQUE (id),
	CONSTRAINT tb_product_hierarchy_attribute_mst_pkey PRIMARY KEY (hierarchy_mst_id, product_attribute_id),
	CONSTRAINT tb_product_hierarchy_attribute_mst_hierarchy_mst_id_fkey FOREIGN KEY (hierarchy_mst_id) REFERENCES size_smart.tb_hierarachy_mst(id),
	CONSTRAINT tb_product_hierarchy_attribute_mst_product_attribute_id_fkey FOREIGN KEY (product_attribute_id) REFERENCES size_smart.tb_product_attribute(id)
);