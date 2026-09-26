--liquibase formatted sql
--changeset liquibase:assort_min_choice_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_min_choice
CREATE TABLE if not exists assort.assort_min_choice (
    l0_name character varying NOT NULL,
    l1_name character varying NOT NULL,
    l2_name character varying NOT NULL,
    l3_name character varying NOT NULL,
    min_cc character varying NOT NULL
);
