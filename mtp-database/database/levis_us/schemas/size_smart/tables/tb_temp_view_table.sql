-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_temp_view_table_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_temp_view_table


CREATE TABLE size_smart.tb_temp_view_table (
	id serial4 NOT NULL,
	view_name varchar(255) NOT NULL,
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
	escalation_final_level varchar(255) NULL,
	buy_qty float8 NULL,
	season_code varchar(255) NULL,
	fiscal_year_week int4 NULL,
	"size" varchar(255) NULL,
	size_range_id int4 NULL,
	escalation_value varchar(255) NULL,
	size_profile_id int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL
	
)
PARTITION BY LIST (application_tag);

-- changeset akashkumar.rana@impactanalytics.co:tb_temp_view_table_modifications_1 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_temp_view_table

CREATE INDEX IF NOT EXISTS idx_tb_temp_view ON size_smart.tb_temp_view_table 
USING btree (display_article,view_name);


-- changeset akashkumar.rana@impactanalytics.co:tb_temp_view_table_modifications_2 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: added index for view_name
CREATE INDEX IF NOT EXISTS idx_tb_temp_view_view_name 
ON size_smart.tb_temp_view_table(view_name);