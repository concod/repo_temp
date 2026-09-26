-- liquibase formatted sql
-- changeset shameel.zeshan@impactanalytics.co:article_priority_1 stripComments:false splitStatements:false context: db_sync labels:article_priority
-- comment: initial changeset for article_priority

CREATE TABLE inventory_smart.article_priority (
	article varchar NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NOT NULL,
	l4_name varchar NOT NULL,
	l5_name varchar NOT NULL,
	default_priority int4 NOT NULL,
    syncstartdatetime timestamp NOT NULL,
	CONSTRAINT article_priority_un UNIQUE (article)
);