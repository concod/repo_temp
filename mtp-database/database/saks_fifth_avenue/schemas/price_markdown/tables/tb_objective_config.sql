--liquibase formatted sql
--changeset liquibase:tb_objective_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_objective_config
CREATE TABLE "price_markdown"."tb_objective_config" (
    id int4 NULL,
    objective_id int4 NULL,
    value_format varchar(50) NULL,
    enable_applicable_value int2 NULL DEFAULT 0,
    max_applicable_value int2 NULL,
    min_applicable_value int2 NULL
)
;