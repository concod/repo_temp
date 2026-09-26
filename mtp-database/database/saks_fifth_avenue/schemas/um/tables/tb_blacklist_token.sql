--liquibase formatted sql
--changeset liquibase:tb_blacklist_token stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_blacklist_token
CREATE TABLE "um"."tb_blacklist_token" (
    token varchar NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
)
;