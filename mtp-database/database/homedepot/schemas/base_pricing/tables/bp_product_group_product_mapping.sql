
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_group_product_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_group_product_mapping_v2

CREATE TABLE base_pricing.bp_product_group_product_mapping (
	pg_id int4 NOT NULL,
	product_id int8 NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	CONSTRAINT bp_pg_product_un UNIQUE (pg_id, product_id),
	CONSTRAINT bp_pg_product_pg_fk FOREIGN KEY (pg_id) REFERENCES base_pricing.bp_product_group(pg_id)
)
PARTITION BY LIST (pg_id);