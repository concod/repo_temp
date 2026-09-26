--liquibase formatted sql
--changeset liquibase:tb_product_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_hierarchy_mapping

CREATE TABLE price_promo.tb_product_hierarchy_mapping (
	product_id int8 NULL,
	l5_cuq text NULL,
	l5_id int8 NULL,
	l5_name text NULL,
	hierarchy_id int4 NULL
);
CREATE INDEX tb_product_hierarchy_mapping_hierarchy_id_idx ON price_promo.tb_product_hierarchy_mapping USING btree (hierarchy_id);
CREATE INDEX tb_product_hierarchy_mapping_product_id_idx ON price_promo.tb_product_hierarchy_mapping USING btree (product_id);


--changeset sidharth.harish@impactanalytics.co:tb_product_hierarchy_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_active flag
ALTER TABLE price_promo.tb_product_hierarchy_mapping ADD is_active int2 NULL DEFAULT 1;
CREATE INDEX tb_product_hierarchy_mapping_is_active_idx ON price_promo.tb_product_hierarchy_mapping (is_active);


--changeset abhishek.singh@impactanalytics.co:tb_product_hierarchy_mapping_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for price_promo.tb_product_hierarchy_mapping
ALTER TABLE price_promo.tb_product_hierarchy_mapping ALTER COLUMN l5_id TYPE text USING l5_id::text;