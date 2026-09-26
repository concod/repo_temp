-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_size_curve_sp_modification stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATION labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATION 
-- comment: updated changeset for tb_size_curve_sp


CREATE TABLE size_smart.tb_size_curve_sp (
	id serial4 NOT NULL,
	application_tag varchar(255) NOT NULL,
	l0_name varchar(255) NOT NULL,
	l1_name varchar(255) NOT NULL,
	l3_name varchar(255) NOT NULL,
	l4_name varchar(255) NOT NULL,
	l5_name varchar(255) NOT NULL,
	l6_name varchar(255) NOT NULL,
	l7_code varchar(255) NOT NULL,
	display_article varchar(255) NULL,
	store_code varchar(255) NULL,
	size_level_proportion numeric NULL,
	global_fit_platform varchar(255) NULL,
	tag varchar(255) NULL,
	fiscal_year_week int4 NULL,
	"size" varchar(255) NULL,
	size_range_id int4 NULL,
	size_profile_id int4 NULL,
	season_code int4 NULL,
	buy_qty float8 NULL,
	escalation_final_level varchar(255) NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	escalation_value varchar(255) NULL,
	district varchar(255) NULL,
	CONSTRAINT tb_size_curve_sp_pkey PRIMARY KEY (application_tag, l0_name, l1_name, l3_name, id)
)
PARTITION BY LIST (application_tag);
CREATE INDEX idx_tb_size_curve_sp_display_article ON  size_smart.tb_size_curve_sp USING btree (display_article);


-- changeset akashkumar.rana@impactanalytics.co:add_season_column_sp stripComments:false splitStatements:false context:add_season_column_sp labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATION 
-- comment: Add season column
ALTER TABLE size_smart.tb_size_curve_sp
ADD COLUMN season varchar NULL;