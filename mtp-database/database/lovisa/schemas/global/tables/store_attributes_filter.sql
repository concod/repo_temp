-- liquibase formatted sql
-- changeset swapnil-bhange-v1:store_attributes_filter_v1 stripComments:false splitStatements:false context:TP-64270_1 labels:store_attributes_filter_v1
-- comment: initial changeset for store_attributes_filter change for if exists

-- "global".store_attributes_filter definition
-- DROP TABLE "global".store_attributes_filter;

CREATE TABLE if not exists "global".store_attributes_filter (
store_code varchar NOT NULL,
store_name varchar NOT NULL,
active boolean default false,
s0_name	varchar	NOT NULL,
channel	varchar	NOT NULL,
s1_name	varchar	NOT NULL,
s2_name	varchar	NOT NULL,
channel_id	varchar	NOT NULL,
open_date	date	NULL,
lovisa_active_flag_ignore varchar	NULL,
store_size	float	NULL,
store_type	varchar	NULL,
longitude	float	NULL,
latitude	float	NULL,
brand	varchar	NULL,
state	varchar	NULL,
city	varchar	NULL,
close_date	date	NULL,
zipcode	varchar	NULL,
dc_flag	boolean	DEFAULT false,
region	varchar	NULL,
district	varchar	NULL,
climate	varchar	NULL,
dc_name	varchar	NULL,
CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset mihir.marwah@impactanalytics.co:store_attributes_filter_col_add stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS special_classification varchar;

--changeset mihir.marwah@impactanalytics.co:store_attributes_filter_col_add_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_description text;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS created_by int4;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS updated_by int4;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS dc_code int4;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS fc_code int4;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS is_deleted boolean;

--changeset mihir.marwah@impactanalytics.co:store_attributes_filter_col_add_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_name_display varchar;

--changeset mihir.marwah@impactanalytics.co:store_attributes_filter_col_add_4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS mapped_dc varchar;
ALTER TABLE "global".store_attributes_filter DROP COLUMN s2_name;

--changeset mihir.marwah@impactanalytics.co:store_attributes_filter_col_rename stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter


ALTER TABLE global.store_attributes_filter RENAME COLUMN lovisa_active_flag_ignore TO store_status;

--changeset mihir.marwah@impactanalytics.co:store_attributes_filter_col_add_5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS forecasting_channel varchar;

--changeset prakhar.suhane@impactanalytics.co:store_attributes_filter_col_add_4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter_4

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS like_store_id varchar;