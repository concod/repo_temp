--liquibase formatted sql
--changeset linu.nazil:article_allocation_tracker_modified stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_allocation_tracker
create table if not exists inventory_smart.article_allocation_tracker(
	article varchar not null, 
	updated_at timestamptz(0) not NULL,
CONSTRAINT article_allocation_tracker_un UNIQUE (article));
