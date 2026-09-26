
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_group_hierarchy_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_group_hierarchy_v2

CREATE TABLE base_pricing.bp_store_group_hierarchy (
	store_group_id int4 NOT NULL,
	hierarchy_level int2 NOT NULL,
	hierarchy_value int4 NOT NULL,
	CONSTRAINT bp_store_group_hierarchy_uniq UNIQUE (store_group_id, hierarchy_level, hierarchy_value),
	CONSTRAINT bp_store_group_hierarchy_sg_id_fk FOREIGN KEY (store_group_id) REFERENCES base_pricing.bp_store_group(store_group_id)
);
CREATE INDEX idx_bp_store_group_hierarchy_sg_id ON base_pricing.bp_store_group_hierarchy USING btree (store_group_id);

-- Table Triggers

create trigger trg_audit_store_group_hierarchy after
insert
    or
delete
    or
update
    on
    base_pricing.bp_store_group_hierarchy for each row execute function base_pricing.trg_audit_store_group_hierarchy();