--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_promo_override_forecast stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_override_forecast
CREATE TABLE price_promo.tb_promo_override_forecast (
	promo_id int NOT NULL,
    scenario_id int NOT NULL,
    reason text NOT NULL,
    overridden_by int NOT NULL,
    "comment" text null,
    is_default boolean NOT NULL default true,
    created_at timestamptz NOT NULL default now()
);

--changeset vamsi.balaga@impactanalytics.co:tb_promo_override_forecast_15100537 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added sales units columns to tb_promo_override_forecast
ALTER TABLE price_promo.tb_promo_override_forecast ADD new_sales_units float8 NULL;
ALTER TABLE price_promo.tb_promo_override_forecast ADD old_sales_units float8 NULL;
ALTER TABLE price_promo.tb_promo_override_forecast ADD new_baseline_sales_units float8 NULL;
ALTER TABLE price_promo.tb_promo_override_forecast ADD old_baseline_sales_units float8 NULL;

--changeset vamsi.balaga@impactanalytics.co:tb_promo_override_forecast_1610123 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed reason column type to int
ALTER TABLE price_promo.tb_promo_override_forecast ALTER COLUMN reason TYPE int4 USING reason::int4;

--changeset vamsi.balaga@impactanalytics.co:tb_promo_override_forecast_1610149 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed reason column to null
ALTER TABLE price_promo.tb_promo_override_forecast ALTER COLUMN reason DROP NOT NULL;

--changeset vamsi.balaga@impactanalytics.co:tb_promo_override_forecast_19110539 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added from_stacking_view column to represent if the override is from stacking view
ALTER TABLE price_promo.tb_promo_override_forecast ADD from_stacking_view bool DEFAULT false NULL;