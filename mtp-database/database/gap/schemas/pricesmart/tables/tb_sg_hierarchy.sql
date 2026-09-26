--liquibase formatted sql
--changeset liquibase:tb_sg_hierarchy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_sg_hierarchy and added if not exists
CREATE TABLE pricesmart.tb_sg_hierarchy (
	sg_id int4 NOT NULL,
	hierarchy_level int2 NOT NULL,
	hierarchy_value int4 NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	hierarchy_name varchar NOT NULL,
	CONSTRAINT tb_sg_hierarchy_pk PRIMARY KEY (sg_id, hierarchy_level, hierarchy_value),
	CONSTRAINT tb_sg_hierarchy_sg_fk FOREIGN KEY (sg_id) REFERENCES pricesmart.tb_store_group(sg_id)
);
CREATE INDEX sg_hierarchy_sg_id_idx ON pricesmart.tb_sg_hierarchy USING btree (sg_id);