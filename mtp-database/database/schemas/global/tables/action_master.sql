--liquibase formatted sql
--changeset liquibase:action_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for action_master
CREATE TABLE IF NOT EXISTS global.action_master
(
    action_code serial4 NOT NULL,
    action varchar NOT NULL,
    CONSTRAINT action_master_pk PRIMARY KEY (action_code)
);
