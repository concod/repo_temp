--liquibase formatted sql
--changeset liquibase:plan_wedge_opt_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_wedge_opt_master
CREATE TABLE assort.plan_wedge_opt_master (
    plan_wedge_opt_id character varying NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    attribute_value jsonb NOT NULL,
    parent_wedge_id character varying(1024),
    image_name_url character varying(1024)
);
ALTER TABLE assort.plan_wedge_opt_master
    ADD CONSTRAINT plan_wedge_opt_master_pkey PRIMARY KEY (plan_wedge_opt_id);
CREATE INDEX plan_wedge_opt_master_plan_code_idx ON assort.plan_wedge_opt_master USING btree (plan_code);
ALTER TABLE assort.plan_wedge_opt_master
    ADD CONSTRAINT plan_wedge_opt_master_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
