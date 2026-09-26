--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:table_partition_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for table_partition_mapping
CREATE TABLE IF NOT EXISTS item_smart.table_partition_mapping (
	table_name text NOT NULL,
	dept text NOT NULL,
	channel text NULL,
	week int4 NULL,
	md5sum text NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	months int4 NULL,
	CONSTRAINT uniq_partition UNIQUE (table_name, dept, channel, week, months)
);
CREATE INDEX IF NOT EXISTS idx_partition_dept_time ON item_smart.table_partition_mapping USING btree (dept, week, months);
CREATE INDEX IF NOT EXISTS idx_partition_lookup ON item_smart.table_partition_mapping USING btree (table_name, week, channel);
