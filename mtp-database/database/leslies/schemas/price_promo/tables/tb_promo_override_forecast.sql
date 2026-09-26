--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_promo_override_forecast stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_override_forecast
CREATE TABLE price_promo.tb_promo_override_forecast (
	promo_id int4 NOT NULL,
	scenario_id int4 NOT NULL,
	reason int4 NULL,
	overridden_by int4 NOT NULL,
	"comment" text NULL,
	is_default bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	new_sales_units float8 NULL,
	old_sales_units float8 NULL,
	new_baseline_sales_units float8 NULL,
	old_baseline_sales_units float8 NULL,
	from_stacking_view bool DEFAULT false NULL
);