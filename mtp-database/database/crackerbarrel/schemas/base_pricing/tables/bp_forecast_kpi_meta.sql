--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:bp_forecast_kpi_meta_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_forecast_kpi_meta_1

CREATE TABLE base_pricing.bp_forecast_kpi_meta (
    kpi_id serial NOT NULL,
    kpi varchar(255) NOT NULL,
    kpi_label varchar(255) NOT NULL,
    default_selected bool DEFAULT false NOT NULL,
    is_active bool DEFAULT true NOT NULL,
    display_order int4 NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT bp_forecast_kpi_meta_pkey PRIMARY KEY (kpi_id),
    CONSTRAINT bp_forecast_kpi_meta_kpi_unique UNIQUE (kpi)
);

CREATE INDEX idx_bp_forecast_kpi_meta_kpi ON base_pricing.bp_forecast_kpi_meta USING btree (kpi);
CREATE INDEX idx_bp_forecast_kpi_meta_is_active ON base_pricing.bp_forecast_kpi_meta USING btree (is_active);
