--liquibase formatted sql
--changeset liquibase:assort_core_size_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_core_size
CREATE TABLE if not exists assort.assort_core_size (
    l0_name character varying,
    l1_name character varying,
    l2_name character varying,
    l3_name character varying,
    size character varying,
    core boolean,
    store_type character varying
);
