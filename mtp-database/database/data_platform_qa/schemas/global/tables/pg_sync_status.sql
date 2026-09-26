--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:pg_sync_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pg_sync_status
CREATE TABLE "global".pg_sync_status (
        task varchar NOT NULL,
        completed_at timestamp NULL,
        CONSTRAINT task_pk PRIMARY KEY (task)
);