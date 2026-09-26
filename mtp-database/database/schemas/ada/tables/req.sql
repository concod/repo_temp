--liquibase formatted sql
--changeset liquibase:req stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for req
CREATE TABLE ada.req (
    input jsonb
);
