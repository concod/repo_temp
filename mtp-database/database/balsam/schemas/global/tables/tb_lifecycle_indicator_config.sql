--liquibase formatted sql
--changeset liquibase:tb_lifecycle_indicator_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_lifecycle_indicator_config
CREATE TABLE "global"."tb_lifecycle_indicator_config" (
    id int4 NOT NULL,
    lifecycle_indicator varchar NULL
)
;

--changeset harsh.singh@impactanalytics.co:tb_lifecycle_indicator_config_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add primary key constraint to tb_lifecycle_indicator_config
ALTER TABLE "global"."tb_lifecycle_indicator_config"
    ADD CONSTRAINT tb_lifecycle_indicator_config_pk PRIMARY KEY (id);