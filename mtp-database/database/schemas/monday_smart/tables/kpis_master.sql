--liquibase formatted sql
--changeset liquibase:kpis_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master
CREATE TABLE monday_smart.kpis_master (
	kpi_code serial4 NOT NULL,
	kc_code int4 NOT NULL,
	"name" varchar NOT NULL,
	description text NULL,
	formula text NOT NULL,
	variables _varchar NOT NULL DEFAULT ARRAY[]::character varying[],
	CONSTRAINT kpis_pk PRIMARY KEY (kpi_code),
	CONSTRAINT kpis_master_fk FOREIGN KEY (kc_code) REFERENCES monday_smart.kpi_categories_master(kc_code) ON DELETE CASCADE
);
--changeset bhargav.polavarapu@impactanalytics.co:kpis_master_new_columns_type_fordesc_addition stripComments:false splitStatements:false context:Release_2 labels:new_columns_type_fordesc_addition
--comment: adding new columns type and formulae description
ALTER TABLE monday_smart.kpis_master
ADD COLUMN "type" varchar NOT NULL DEFAULT 'simple'::character varying,
ADD COLUMN formula_description varchar(50) NULL;

--changeset bhargav.polavarapu@impactanalytics.co:new_column_addition stripComments:false splitStatements:false context:Release_2 labels:new_column_addition
--comment: new column addition
ALTER TABLE monday_smart.kpis_master
ADD COLUMN identifier varchar(50) NULL,
ADD COLUMN display_name varchar(50) NULL,
ADD COLUMN sort_order int NULL,
ADD COLUMN format varchar(50) NULL;

--changeset bhargav.polavarapu@impactanalytics.co:new_column_additionn stripComments:false splitStatements:false context:Release_2 labels:new_column_additionn
--comment: new column additionn
ALTER TABLE monday_smart.kpis_master
add COLUMN min_thres float null ,
add COLUMN max_thres float null;

--changeset bhargav.polavarapu@impactanalytics.co:drop_column_kpis_master stripComments:false splitStatements:false context:Release_2 labels:new_columns_type_fordesc_addition
--comment: dropping additional columns question_identifier,response_source,is_active,response and formulae description
ALTER TABLE monday_smart.kpis_master
Drop COLUMN IF EXISTS question_identifier  ,
Drop COLUMN IF EXISTS  response_source ,
Drop COLUMN IF EXISTS  is_active ,
Drop COLUMN IF EXISTS response  ;