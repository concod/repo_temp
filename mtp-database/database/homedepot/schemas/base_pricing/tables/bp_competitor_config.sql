--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_competitor_config_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_competitor_config_v1

CREATE TABLE base_pricing.bp_competitor_config (
	id serial4 NOT NULL,
	competitor_name text NULL,
	competitor_label text NULL
);
CREATE INDEX bs_competitor_config ON base_pricing.bp_competitor_config USING btree (id);