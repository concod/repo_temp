--liquibase formatted sql
--changeset vishnu.vardhan@impactanalytics.co:comment_status_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.comment_status_enum
CREATE TYPE pricesmart."comment_status_enum" AS ENUM ('open', 'resolve');