--liquibase formatted sql
--changeset liquibase:plan_wedge_opt_attribute stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_wedge_opt_attribute
CREATE TABLE assort.plan_wedge_opt_attribute (
    plan_code integer,
    levels jsonb NOT NULL,
    attribute_value character varying(200) NOT NULL,
    attribute_name character varying(200)
);
CREATE INDEX plan_wedge_opt_attribute_plan_code_idx ON assort.plan_wedge_opt_attribute USING btree (plan_code);
