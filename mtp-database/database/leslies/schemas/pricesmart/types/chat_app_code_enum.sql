--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:chat_app_code_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.chat_app_code_enum
CREATE TYPE pricesmart."chat_app_code_enum" AS ENUM ('promosmart', 'markdown', 'basesmart');
