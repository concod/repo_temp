--liquibase formatted sql
--changeset linu.nazil:article_allocation_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_allocation_tracker
create table inventory_smart.article_allocation_tracker(
	article varchar not null, 
	updated_at timestamptz(0) not NULL,
CONSTRAINT article_allocation_tracker_un UNIQUE (article));

--changeset rajnish.kumar@impactanalytics.co:article_allocation_tracker_new_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding channel column
ALTER TABLE inventory_smart.article_allocation_tracker ADD COLUMN IF NOT EXISTS channel varchar;

--changeset linu.nazil:article_allocation_tracker_un stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding channel column
ALTER TABLE inventory_smart.article_allocation_tracker drop constraint IF EXISTS article_allocation_tracker_un;
ALTER TABLE inventory_smart.article_allocation_tracker ADD CONSTRAINT article_channel_un UNIQUE (article, channel);
