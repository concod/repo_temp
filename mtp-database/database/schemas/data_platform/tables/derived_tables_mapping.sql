--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:derived_tables_mapping stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: is_deleted default value fix

CREATE TABLE IF NOT EXISTS data_platform.derived_tables_mapping
(
    name character varying COLLATE pg_catalog."default",
    run_in character varying COLLATE pg_catalog."default",
    replace_flag_gbq boolean,
    replace_flag_psg boolean,
    execution_order integer,
    type character varying COLLATE pg_catalog."default",
    schedule_interval character varying COLLATE pg_catalog."default",
    is_deleted boolean NOT NULL DEFAULT false,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone,
    deleted_by integer,
    deleted_at timestamp with time zone
);


--changeset mohammed.abdulla@impactanalytics.co:derived_tables_mapping stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: update the replace_flag_gbq and replace_flag_psg column type from boolean to varchar
ALTER TABLE data_platform.derived_tables_mapping
ALTER COLUMN replace_flag_gbq TYPE varchar USING 
  CASE 
    WHEN replace_flag_gbq IS TRUE THEN 'replace'
    WHEN replace_flag_gbq IS FALSE THEN 'append'
    ELSE 'null'
  END;

-- add constraint
ALTER TABLE data_platform.derived_tables_mapping
ADD CONSTRAINT allowed_values_replace_flag_gbq
CHECK (replace_flag_gbq IN ('replace','append','upsert','null') OR replace_flag_gbq IS NULL);

-- alter the column type from boolean to varchar
ALTER TABLE data_platform.derived_tables_mapping
ALTER COLUMN replace_flag_psg TYPE varchar USING 
  CASE 
    WHEN replace_flag_psg IS TRUE THEN 'replace'
    WHEN replace_flag_psg IS FALSE THEN 'append'
    ELSE 'null'
  END;

-- add constraint
ALTER TABLE data_platform.derived_tables_mapping
ADD CONSTRAINT allowed_values_replace_flag_psg
CHECK (replace_flag_psg IN ('replace','append','upsert','null') OR replace_flag_psg IS NULL);

-- add label column
ALTER TABLE data_platform.derived_tables_mapping
ADD COLUMN label text;

-- And to update existing NULL values to 'public'
UPDATE data_platform.derived_tables_mapping
SET label = 'public'
WHERE label IS NULL;

-- change datatype of replace_flag_gbq and replace_flag_psg to varchar
ALTER TABLE data_platform.derived_tables_mapping
ALTER COLUMN replace_flag_gbq TYPE varchar;

ALTER TABLE data_platform.derived_tables_mapping
ALTER COLUMN replace_flag_psg TYPE varchar;



--changeset mohammed.abdulla@impactanalytics.co:derived_tables_mapping_1 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: updates values 


update data_platform.derived_tables_mapping
set replace_flag_gbq = null
where replace_flag_gbq = 'null';

update data_platform.derived_tables_mapping
set replace_flag_psg = null
where replace_flag_psg = 'null';

--changeset mohammed.abdulla@impactanalytics.co:add_db_column stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add db column
ALTER TABLE data_platform.derived_tables_mapping 
ADD COLUMN db CHARACTER VARYING DEFAULT 'common';

ALTER TABLE data_platform.derived_tables_mapping 
ALTER COLUMN "label" TYPE varchar USING "label"::varchar;










