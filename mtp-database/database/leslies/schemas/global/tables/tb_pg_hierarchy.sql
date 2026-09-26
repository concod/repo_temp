--liquibase formatted sql
--changeset liquibase:tb_pg_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_pg_hierarchy with if not exists
CREATE TABLE "global".tb_pg_hierarchy (
	pg_id int4 NOT NULL,
	hierarchy_level int2 NOT NULL,
	hierarchy_value int4 NOT NULL,
	is_deleted int2 NOT NULL DEFAULT 0,
	is_temporary int2 NOT NULL DEFAULT 0,
	CONSTRAINT tb_pg_hierarchy_un UNIQUE (pg_id, hierarchy_level, hierarchy_value),
	CONSTRAINT tb_pg_hierarchy_pg_fk FOREIGN KEY (pg_id) REFERENCES "global".tb_product_group(pg_id)
);
CREATE INDEX pg_hierarchy_pg_id_idx ON global.tb_pg_hierarchy USING btree (pg_id);


--changeset vamsi.balaga@impactanalytics.co:tb_pg_hierarchy_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_pg_hierarchy
ALTER TABLE "global".tb_pg_hierarchy
    ADD CONSTRAINT tb_pg_hierarchy_pk PRIMARY KEY (pg_id, hierarchy_level, hierarchy_value);
ALTER TABLE "global".tb_pg_hierarchy
    DROP CONSTRAINT IF EXISTS tb_pg_hierarchy_un;
