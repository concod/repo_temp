--liquibase formatted sql
--changeset liquibase:plan_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_master
CREATE TABLE inventory_smart.plan_master (
	plan_code varchar NOT NULL,
	"name" varchar NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	is_deleted bool NOT NULL DEFAULT false,
	updated_by int4 NULL,
	created_by int4 NULL,
	special_classification varchar NULL,
	planning_level_hierarchy varchar NOT NULL,
	description text NULL,
	status int2 NOT NULL DEFAULT 0,
	steps numeric(2, 1) NOT NULL DEFAULT 1.1,
	"type" int4 NULL,
	CONSTRAINT plan_master_pk PRIMARY KEY (plan_code),
	CONSTRAINT ps_plan_master_un UNIQUE (name, is_deleted)
);
CREATE INDEX plan_master_plan_code_idx ON inventory_smart.plan_master USING btree (plan_code, status);
ALTER TABLE inventory_smart.plan_master ADD CONSTRAINT invs_plan_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE inventory_smart.plan_master ADD CONSTRAINT invs_plan_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;

--changeset rajesh.karunanidhi:plan_master stripComments:false splitStatements:false context:MTP-19557 labels:MTP-19557
--comment: removed plan name constraint from plan_master
ALTER TABLE inventory_smart.plan_master DROP CONSTRAINT ps_plan_master_un;
