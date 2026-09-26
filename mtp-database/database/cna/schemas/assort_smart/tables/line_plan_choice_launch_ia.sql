--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.line_plan_choice_launch_ia_briscoes stripComments:false splitStatements:false context:MTP-79967 labels:create_table_line_plan_choice_launch_ia_briscoes
--comment: initial changeset for line_plan_choice_launch_ia_briscoes

CREATE TABLE IF NOT EXISTS assort_smart.line_plan_choice_launch_ia (
id serial4 NOT NULL,
hierarchy_code varchar NOT NULL,
season_code varchar NULL,
placeholder_choice_id varchar NOT NULL,
placeholder_style_id varchar NOT NULL,
launch varchar NULL,
channel int4 NOT NULL,
sub_channel int4 NOT NULL,
final_level varchar NOT NULL,
total_inv_units jsonb NULL,
sales_units jsonb NULL,
receipt_units jsonb NULL,
receipts_price_per_unit jsonb NULL,
aps jsonb NULL,
sales jsonb NULL,
receipts jsonb NULL,
st jsonb NULL,
avg_wk_cnt jsonb NULL,
gross_margin jsonb NULL,
aur jsonb NULL,
air jsonb NULL,
aic jsonb NULL,
created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
constraint line_plan_choice_launch_ia_pkey PRIMARY KEY (id));
CREATE INDEX IF NOT EXISTS line_plan_choice_launch_ia_idx
ON assort_smart.line_plan_choice_launch_ia (season_code,channel);


--changeset vishal.hosamani@impactanalytics.co :assort_smart.line_plan_choice_launch_ia_briscoes stripComments:false splitStatements:false context:MTP-79967 labels:add_season_name_col
--comment: adding season_name column
ALTER TABLE assort_smart.line_plan_choice_launch_ia
ADD COLUMN IF NOT EXISTS season_name varchar(50) NULL;

--changeset srinivasgowda.sg:MTP-129397 add new column  stripComments:false splitStatements:false context:MTP-102879-wp-plan-code_changes labels:liquibase_project_start
--comment: MTP-129397 add new column
CREATE INDEX idx_lpcl_ia_ch_sn_hc_pc ON assort_smart.line_plan_choice_launch_ia USING btree (channel, season_name, hierarchy_code, placeholder_choice_id);