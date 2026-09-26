--liquibase formatted sql
--changeset liquibase:tb_placeholder_targets stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_placeholder_targets
CREATE TABLE price_promo.tb_placeholder_targets (
	promo_id int4 NOT NULL,
	status int2 NOT NULL,
	inventory int4 NULL,
	discount int4 NULL,
	revenue_target float8 NULL,
	units_target float8 NULL,
	gross_margin_target float8 NULL,
	gross_margin_percent_target float8 NULL,
	CONSTRAINT tb_placeholder_targets_pkey PRIMARY KEY (promo_id)
);
CREATE INDEX idx_tb_placeholder_targets_promo_id ON price_promo.tb_placeholder_targets USING btree (promo_id);
CREATE INDEX idx_tb_placeholder_targets_promo_id_status ON price_promo.tb_placeholder_targets USING btree (promo_id, status);
CREATE INDEX idx_tb_placeholder_targets_status ON price_promo.tb_placeholder_targets USING btree (status);