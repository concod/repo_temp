--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:chat_status_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.chat_status_enum
CREATE TYPE pricesmart."chat_status_enum" AS ENUM ('open', 'resolved', 'closed', 'archived');
