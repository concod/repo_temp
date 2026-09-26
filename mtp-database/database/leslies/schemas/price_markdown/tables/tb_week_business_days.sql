--liquibase formatted sql
--changeset liquibase:tb_week_business_days stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_week_business_days
CREATE TABLE price_markdown.tb_week_business_days (
	week_day text NULL,
	business_days text NULL
);