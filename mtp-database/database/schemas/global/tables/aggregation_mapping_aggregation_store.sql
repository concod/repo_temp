--liquibase formatted sql
--changeset liquibase:aggregation_mapping_aggregation_store stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for aggregation_mapping_aggregation_store
CREATE TABLE "global".aggregation_mapping_aggregation_store (
	mapping_code serial4 NOT NULL,
	mapping_type varchar NOT NULL,
	l0_name varchar NOT NULL,
	aggregation_code varchar NOT NULL,
	store_code varchar NOT NULL,
	is_active bool NOT NULL DEFAULT true,
	validity datemultirange NULL,
	CONSTRAINT aggregation_mapping_aggregation_store_pk PRIMARY KEY (mapping_code, l0_name),
	CONSTRAINT aggregation_mapping_aggregation_store_un UNIQUE (l0_name, aggregation_code, store_code),
	CONSTRAINT aggregation_mapping_aggregation_store_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE INDEX aggregation_mapping_aggregation_store_aggregation_code_idx ON global.aggregation_mapping_aggregation_store USING btree (aggregation_code);
CREATE INDEX aggregation_mapping_aggregation_store_store_code_idx ON global.aggregation_mapping_aggregation_store USING btree (store_code);

--changeset kailash.yadav@impactanalytics.co:product_mapping_product_store stripComments:false splitStatements:false context:change_log labels:updated_by_column_add
--comment: change set to add column updated_by

ALTER TABLE "global".aggregation_mapping_aggregation_store ADD updated_by int4 NULL;
ALTER TABLE "global".aggregation_mapping_aggregation_store ADD CONSTRAINT aggregation_mapping_aggregation_store_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;

--changeset shreyas.sankpal@impactanalytics.co:aggregation_mapping_aggregation_store_MTP-52725 stripComments:false splitStatements:false context:Columns_for_is_upload labels:MTP-52725
--comment: add columns creation_source_id and current_updation_id
ALTER TABLE "global".aggregation_mapping_aggregation_store ADD creation_source_id int4 NULL DEFAULT 0;
ALTER TABLE "global".aggregation_mapping_aggregation_store ADD current_updation_id int4 NULL DEFAULT 0;


--changeset akshay.jain@impactanalytics.co:product_mapping_product_store1 stripComments:false splitStatements:false context:change_log labels:updated_at_column_add
--comment: change set to add column updated_at
ALTER TABLE "global".aggregation_mapping_aggregation_store add if not exists updated_at timestamptz DEFAULT now();
