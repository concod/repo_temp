--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.line_plan_kpi_cards stripComments:false splitStatements:false context:MTP-75018 labels:initial_changeset
--comment: initial changeset for line_plan_kpi_cards

-- DROP TABLE assort_smart.line_plan_kpi_cards;
CREATE TABLE IF NOT EXISTS assort_smart.line_plan_kpi_cards (
	plan_kpi_id bigserial NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code varchar NOT NULL,
	sales_ty float8 DEFAULT 0.0 NULL,
	sales_ly float8 DEFAULT 0.0 NULL,
	sales_units_ty float8 DEFAULT 0.0 NULL,
	sales_units_ly float8 DEFAULT 0.0 NULL,
	gross_margin_ty float8 DEFAULT 0.0 NULL,
	gross_margin_ly float8 DEFAULT 0.0 NULL,
	receipts_ty float8 DEFAULT 0.0 NULL,
	receipts_ly float8 DEFAULT 0.0 NULL,
	aur_ty float8 DEFAULT 0.0 NULL,
	aur_ly float8 DEFAULT 0.0 NULL,
	auc_ty float8 DEFAULT 0.0 NULL,
	auc_ly float8 DEFAULT 0.0 NULL,
	choice_ty float8 DEFAULT 0.0 NULL,
	choice_ly float8 DEFAULT 0.0 NULL,
	"prod$_ty" float8 DEFAULT 0.0 NULL,
	"prod$_ly" float8 DEFAULT 0.0 NULL,
	CONSTRAINT line_plan_kpi_cards_pkey PRIMARY KEY (plan_kpi_id)
);
CREATE INDEX IF NOT EXISTS line_plan_kpi_cards_plan_idx ON assort_smart.line_plan_kpi_cards USING btree (plan_code);

--changeset rishabh.kumar@impactanalytics.co:remove_hierarchy_code stripComments:false splitStatements:false context:remove_hierarchy_code labels:initial_changeset
--comment: Remove hierarchy code
ALTER TABLE assort_smart.line_plan_kpi_cards DROP COLUMN hierarchy_code;

--changeset kumar.shubham@impactanalytics.co:add_buy_units_style_count_choice_count stripComments:false splitStatements:false context:add_columns_buy_units_style_count_choice_count labels:column_addition
--comment: Add buy_units_ty, buy_units_ly, style_count_ty, style_count_ly, choice_count_ty, choice_count_ly columns to line_plan_kpi_cards
ALTER TABLE assort_smart.line_plan_kpi_cards
    ADD COLUMN IF NOT EXISTS receipts_quantity_ty float8 DEFAULT 0.0 NULL,
    ADD COLUMN IF NOT EXISTS receipts_quantity_ly float8 DEFAULT 0.0 NULL,
    ADD COLUMN IF NOT EXISTS style_ty float8 DEFAULT 0.0 NULL,
    ADD COLUMN IF NOT EXISTS style_ly float8 DEFAULT 0.0 NULL;


--changeset mayank.bhardwaj@impactanalytics.co:line_plan_kpi_cards_new_bop_units_lystripComments:false splitStatements:false context:line_plan_kpi_cards_new_bop_units_ly labels:line_plan_kpi_cards_new_bop_units_ly
--comment: line_plan_kpi_cards_new_bop_units_ly
ALTER TABLE assort_smart.line_plan_kpi_cards
ADD COLUMN IF NOT EXISTS total_available_quantity_ly NUMERIC DEFAULT 0.0 NULL,
ADD COLUMN IF NOT EXISTS bop_units_ly NUMERIC DEFAULT 0.0 NULL,
ADD COLUMN IF NOT EXISTS bop_units_ty NUMERIC DEFAULT 0.0 NULL;

--changeset mayank.bhardwaj@impactanalytics.co:alter_line_plan_kpi_cards_numeric_to_float8 stripComments:false splitStatements:false context:alter_line_plan_kpi_cards_numeric_to_float8 labels:alter_line_plan_kpi_cards_numeric_to_float8
--comment: Change total_available_quantity_ly, bop_units_ly, bop_units_ty from NUMERIC to float8
ALTER TABLE assort_smart.line_plan_kpi_cards
ALTER COLUMN total_available_quantity_ly TYPE float8 USING total_available_quantity_ly::float8,
ALTER COLUMN bop_units_ly TYPE float8 USING bop_units_ly::float8,
ALTER COLUMN bop_units_ty TYPE float8 USING bop_units_ty::float8;

--changeset mayank.bhardwaj@impactanalytics.co:drop_line_plan_kpi_cards_columns stripComments:false splitStatements:false context:drop_line_plan_kpi_cards_columns labels:drop_line_plan_kpi_cards_columns
--comment: Drop total_available_quantity_ly, bop_units_ly, bop_units_ty columns if they exist
ALTER TABLE assort_smart.line_plan_kpi_cards
DROP COLUMN IF EXISTS total_available_quantity_ly,
DROP COLUMN IF EXISTS bop_units_ly,
DROP COLUMN IF EXISTS bop_units_ty;

--changeset mayank.bhardwaj@impactanalytics.co:add_total_inv_units_ty stripComments:false splitStatements:false context:add_total_inv_units_ty labels:add_total_inv_units_ty
--comment: Add total_inv_units_ty column if it does not exist
ALTER TABLE assort_smart.line_plan_kpi_cards
ADD COLUMN IF NOT EXISTS total_inv_units_ty float8 DEFAULT 0.0;