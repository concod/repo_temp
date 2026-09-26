--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_pg_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:tb_pg_hierarchy_1


CREATE TABLE pricesmart.tb_pg_hierarchy (
	pg_id int4 NOT NULL,
	hierarchy_level int2 NOT NULL,
	hierarchy_value int4 NOT NULL,
	hierarchy_name text NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	is_temporary int2 DEFAULT 0 NOT NULL,
	CONSTRAINT tb_pg_hierarchy_pk PRIMARY KEY (pg_id, hierarchy_level, hierarchy_value),
	CONSTRAINT tb_pg_hierarchy_pg_fk FOREIGN KEY (pg_id) REFERENCES pricesmart.tb_product_group(pg_id)
);
CREATE INDEX pg_hierarchy_pg_id_idx ON pricesmart.tb_pg_hierarchy USING btree (pg_id);
