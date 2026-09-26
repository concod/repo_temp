--liquibase formatted sql
--changeset liquibase:fiscal_date_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fiscal_date_mapping
CREATE TABLE IF NOT EXISTS global.fiscal_date_mapping (
    fiscal_day smallint,
    fiscal_week_in_month smallint,
    fiscal_week_in_quarter smallint,
    fiscal_day_name character varying ,
    fiscal_week_begin_date date,
    fiscal_week_end_date date,
    fiscal_year_month integer,
    fiscal_day_name_abb character varying ,
    fiscal_month_in_quarter smallint,
    fiscal_month_in_year smallint,
    fiscal_month_begin_date date,
    fiscal_week_in_season smallint,
    fiscal_month_end_date date,
    fiscal_quarter_in_year smallint,
    fiscal_year_week_prior int4,
    fiscal_year_week_2wa int4,
    fiscal_quarter_begin_date date,
    fiscal_quarter_end_date date,
    fiscal_year_begin_date date,
    fiscal_month_in_season smallint,
    fiscal_year_end_date date,
    fiscal_day_in_week smallint,
    fiscal_prior_year_comp_week integer,
    fiscal_season_begin_date smallint,
    fiscal_week smallint,
    fiscal_quarter_name character varying ,
    fiscal_quarter_name_abb character varying ,
    fiscal_year_quarter_prior int4,
    fiscal_week_in_year smallint,
    fiscal_season_in_year smallint,
    fiscal_season_end_date smallint,
    fiscal_year_season_prior smallint,
    calendar_date date,
    date_id integer,
    weekday_indicator character varying ,
    fiscal_quarter_in_season smallint,
    fiscal_month_name character varying ,
    fiscal_month_name_abb character varying ,
    fiscal_year_month_prior int4,
    fiscal_year_period integer,
    fiscal_day_in_season smallint,
    fiscal_day_in_quarter smallint,
    fiscal_year_week integer,
    fiscal_bi_week smallint,
    fiscal_day_in_year smallint,
    day_of_week smallint,
    date date,
    fiscal_day_in_month smallint,
    fiscal_year_quarter integer,
    fiscal_season_name smallint,
    fiscal_season_name_abb smallint,
    fiscal_month smallint,
    fiscal_quarter smallint,
    fiscal_year smallint,
    fiscal_year_week_3wa int4,
    fiscal_year_season smallint
);
CREATE INDEX IF NOT EXISTS fiscal_date_mapping_date_idx ON global.fiscal_date_mapping USING btree(date);

--changeset liquibase:kailash.yadav1 stripComments:false splitStatements:false context:DAT-849 labels:fiscal_date_mapping
--comment: Added unique constraints
do
$$
begin 
if not exists (
select
	constraint_name
from
	information_schema.table_constraints
where
	table_name = 'fiscal_date_mapping'
	and constraint_type = 'PRIMARY KEY') then
alter table "global".fiscal_date_mapping add constraint date_un primary key (date);
end if;
end
$$;

--changeset sreenivas.s@impactanalytics.co:fiscal_date_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fiscal_date_mapping
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists cal_week_end_day date;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists cal_week_start_day date;
ALTER TABLE "global".fiscal_date_mapping DROP column date_id;