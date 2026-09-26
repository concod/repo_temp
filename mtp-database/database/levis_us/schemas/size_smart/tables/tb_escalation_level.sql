-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_escalation_level_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_escalation_level

CREATE TABLE  size_smart.tb_escalation_level (
	id serial4 NOT NULL,
	product_hierarchy_id int4 NOT NULL,
	store_hierarchy_id int4 NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT tb_escalation_level_id_key UNIQUE (id),
	CONSTRAINT tb_escalation_level_pkey PRIMARY KEY (product_hierarchy_id, store_hierarchy_id),
	CONSTRAINT tb_escalation_level_product_hierarchy_id_fkey FOREIGN KEY (product_hierarchy_id) REFERENCES size_smart.tb_product_hierarchy(id),
	CONSTRAINT tb_escalation_level_store_hierarchy_id_fkey FOREIGN KEY (store_hierarchy_id) REFERENCES size_smart.tb_store_hierarchy(id)
);


-- changeset akashkumar.rana@impactanalytics.co:tb_escalation_level_modifications_ADD_DISPLAY_ORDER stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-ADD-DISPLAY-ORDER labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-ADD-DISPLAY-ORDER 
-- comment: Add display order column to tb_escalation_level

ALTER TABLE size_smart.tb_escalation_level
ADD COLUMN display_order int4 DEFAULT 1 NOT NULL;




