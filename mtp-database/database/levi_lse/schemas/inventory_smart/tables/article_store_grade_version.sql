--liquibase formatted sql
--changeset himansh.bhardwaj:article_store_grade_version stripComments:false splitStatements:false context:Release_1_0 labels:levis_us_article_store_grade
--comment: initial changeset for article_store_grade_version

CREATE TABLE inventory_smart.article_store_grade_version (
    version_code int4 NOT NULL,
    article varchar NOT NULL,
    store_code varchar NOT NULL,
    grade varchar NOT NULL,
    ph_code integer NOT NULL,
    priority int4 DEFAULT 1,
    CONSTRAINT article_store_grade_version_pk PRIMARY KEY (version_code, article, store_code)
)
PARTITION BY LIST (version_code);

-- inventory_smart.article_store_grade_version foreign keys

ALTER TABLE inventory_smart.article_store_grade_version ADD CONSTRAINT article_store_grade_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;