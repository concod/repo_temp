--liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:table_set_up_in_test_03 stripComments:false splitStatements:false context:Release_1_0_03 labels:levis_test_03
--comment: added active_season_maopping table in UAT 01

CREATE TABLE if not exists size_smart.active_season_mapping (
	id serial4 NOT NULL,
	planning_month_year text NOT NULL,
	season_name text NOT NULL,
	active_season varchar(4) NULL,
	CONSTRAINT active_season_mapping_pkey PRIMARY KEY (id)
);
--liquibase formatted sql
--changeset aaqib.khan@impactanalytics.co:table_set_up_in_test_02 stripComments:false splitStatements:false context:Release_1_0_02 labels:levis_test_02
--comment: added start and end dates in the table

ALTER TABLE size_smart.active_season_mapping
    ADD COLUMN IF NOT EXISTS season_name_h text,
    ADD COLUMN IF NOT EXISTS season_start_date date,
    ADD COLUMN IF NOT EXISTS season_end_date date;

--changeset aaqib.khan@impactanalytics.co:column addition in test table stripComments:false splitStatements:false context:Release_1_0_32 labels:levis_test_03
--comment: column addition in test table
ALTER TABLE size_smart.active_season_mapping
ADD COLUMN start_date_wk_number TEXT,
ADD COLUMN end_date_wk_number TEXT,
ADD COLUMN season_name_algo TEXT;


--changeset akashkumar.rana@impactanalytics.co:last_comparable_season and last_completed_season addition stripComments:false splitStatements:false context:last_comparable_season and last_completed_season addition labels:last_comparable_season and last_completed_season addition
--comment: last_comparable_season and last_completed_season addition
ALTER TABLE size_smart.active_season_mapping
ADD COLUMN IF NOT EXISTS last_comparable_season varchar(255) NULL,
ADD COLUMN IF NOT EXISTS last_completed_season varchar(255) NULL;
