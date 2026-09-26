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