
--liquibase formatted sql
--changeset liquibase:article_store_grade stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_store_grade

select 1;