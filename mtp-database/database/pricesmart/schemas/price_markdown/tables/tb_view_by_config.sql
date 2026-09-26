--liquibase formatted sql
--changeset liquibase:tb_view_by_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_view_by_config
CREATE TABLE "price_markdown"."tb_view_by_config" (
    id int4 NULL,
    category varchar(50) NULL,
    name varchar(50) NULL,
    display_name varchar(50) NULL,
    value int4 NULL,
    is_active int4 NULL
)
;

--changeset durgaprasad.tulugu@impactanalytics.co:valid_strategy_reco_level stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added column valid_strategy_reco_level.
ALTER TABLE price_markdown.tb_view_by_config ADD valid_strategy_reco_level boolean DEFAULT false NULL;


--changeset surya.avinash@impactanalytics.co:reporting_display_name stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added column reporting_display_name.
ALTER TABLE price_markdown.tb_view_by_config ADD reporting_display_name varchar(50) NULL;