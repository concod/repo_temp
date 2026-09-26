--liquibase formatted sql
--changeset gautam.baruah@impactanalytics.co:default_user_table_view_mapping stripComments:false splitStatements:false context:MTP-36223 labels:liquibase_project_start
--comment: creating table default_user_table_view_mapping

CREATE TABLE "global".default_user_table_view_mapping (
	view_id int4 NOT NULL,
	user_code int4 NOT NULL,
	tc_code int4 NOT NULL,
	CONSTRAINT default_user_table_view_mapping_un UNIQUE (tc_code, user_code),
	CONSTRAINT default_user_table_view_mapping_fk FOREIGN KEY (view_id) REFERENCES "global".table_config_views(id)
);
CREATE INDEX default_user_table_view_mapping_idx_uc_tc_code ON global.default_user_table_view_mapping USING btree (user_code, tc_code);

--changeset kamalesh.k@impactanalytics.co:default_user_table_view_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for default_user_table_view_mapping

ALTER TABLE "global".default_user_table_view_mapping
DROP CONSTRAINT IF EXISTS default_user_table_view_mapping_un;

ALTER TABLE "global".default_user_table_view_mapping
ADD CONSTRAINT default_user_table_view_mapping_pkey PRIMARY KEY (user_code, tc_code);
