--liquibase formatted sql
--changeset liquibase:plan_finalize_size_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_finalize_size_master
CREATE TABLE assort.plan_finalize_size_master (
    plan_finalize_size_id serial4 NOT NULL,
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    attributes jsonb
);
ALTER TABLE assort.plan_finalize_size_master
    ADD CONSTRAINT plan_finalize_size_master_pkey PRIMARY KEY (plan_finalize_size_id);
CREATE INDEX plan_finalize_size_master_idx ON assort.plan_finalize_size_master USING btree (plan_code) WITH (fillfactor='90');
ALTER TABLE assort.plan_finalize_size_master
    ADD CONSTRAINT plan_finalize_size_master_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
