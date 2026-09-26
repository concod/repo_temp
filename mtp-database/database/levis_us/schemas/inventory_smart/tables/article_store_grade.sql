--liquibase formatted sql
--changeset aniruddh.singh@impactanalytics.co:article_store_grade stripComments:false splitStatements:false context:Release_1_0 labels:levis_us_article_store_grade
--comment: initial changeset for article_store_grade
CREATE TABLE if NOT exists inventory_smart.article_store_grade (
	article character varying NOT NULL,
	store_code character varying NOT NULL,
	grade character varying NOT NULL,
	ph_code integer NOT NULL
);
ALTER TABLE inventory_smart.article_store_grade ADD COLUMN IF NOT EXISTS priority int4 DEFAULT 1;