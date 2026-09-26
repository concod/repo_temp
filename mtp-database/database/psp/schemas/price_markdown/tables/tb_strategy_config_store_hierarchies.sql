--liquibase formatted sql
--changeset liquibase:tb_strategy_config_store_hierarchies stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_config_store_hierarchies
CREATE TABLE "price_markdown"."tb_strategy_config_store_hierarchies" (
    strategy_config_id int4 NOT NULL,
    hierarchy_level int4 NOT NULL,
    hierarchy_level_id int4 NOT NULL
)
;


--changeset sidharth.harish@impactanalytics.co:tb_strategy_config_store_hierarchies_hierarchy_level_name_column_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added hierarchy_level_name to tb_strategy_config_store_hierarchies_1
ALTER TABLE price_markdown.tb_strategy_config_store_hierarchies ADD hierarchy_level_name text NULL;