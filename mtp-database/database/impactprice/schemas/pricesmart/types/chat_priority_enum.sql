--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:chat_priority_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.chat_priority_enum
CREATE TYPE pricesmart."chat_priority_enum" AS ENUM ('low', 'normal', 'medium', 'high');