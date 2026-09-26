--liquibase formatted sql
--changeset gautam.baruah@impactanalytics.co:ph_scheduler_mapping_ddl stripComments:false splitStatements:false context:Release_MTP_45854 labels:MTP_45854
--comment: initial changeset for ph_scheduler_mapping table

CREATE TABLE inventory_smart.ph_scheduler_mapping (
	ph_code int4 NOT NULL,
	article varchar NOT NULL,
	channel varchar NOT NULL,
	l0_name varchar NOT NULL,
	scheduler_code int8 NULL,
	is_active bool NULL DEFAULT true,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	CONSTRAINT ph_scheduler_mapping_scheduler_code_fk FOREIGN KEY (scheduler_code) REFERENCES inventory_smart.alloc_rule_master(rule_code) ON DELETE SET NULL
);
CREATE INDEX idx_scheduler_article ON inventory_smart.ph_scheduler_mapping USING btree (article);

--changeset gautam.baruah@impactanalytics.co:added_alter_commands_for_article_channel stripComments:false splitStatements:false context:Release_1_2 labels:Release_1_2
--comment: added alter commands to create index on article,channel
DROP INDEX IF EXISTS inventory_smart.idx_scheduler_article;
CREATE INDEX idx_scheduler_article_channel ON inventory_smart.ph_scheduler_mapping USING btree (article, channel);
