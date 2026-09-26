--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_group_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_group_hierarchy

CREATE TABLE base_pricing_restaurant.bp_product_group_hierarchy (
	pg_id int4 NOT NULL,
	hierarchy_level int2 NOT NULL,
	hierarchy_value int4 NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	is_temporary int2 DEFAULT 0 NOT NULL,
	CONSTRAINT tb_pg_hierarchy_un UNIQUE (pg_id, hierarchy_level, hierarchy_value),
	CONSTRAINT tb_pg_hierarchy_pg_fk FOREIGN KEY (pg_id) REFERENCES base_pricing_restaurant.bp_product_group(pg_id)
);
CREATE INDEX pg_hierarchy_pg_id_idx ON base_pricing_restaurant.bp_product_group_hierarchy USING btree (pg_id);