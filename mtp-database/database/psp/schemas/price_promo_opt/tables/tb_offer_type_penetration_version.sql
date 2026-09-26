--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_offer_type_penetration_version_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_offer_type_penetration_version

DROP TABLE IF EXISTS price_promo_opt.tb_offer_type_penetration_version CASCADE;

CREATE TABLE price_promo_opt.tb_offer_type_penetration_version (
	offer_type text NOT NULL,
	offer_x_value int4 NULL,
	offer_x_type text NULL,
	offer_y_value int4 NULL,
	offer_y_type text NULL,
	offer_z_value int4 NULL,
	offer_z_type text NULL,
	offer_pen_factor float8 NULL,
	version_code int4 NOT NULL
)
PARTITION BY LIST (version_code);
CREATE INDEX idx_tb_offer_penetration_offer_type ON price_promo_opt.tb_offer_type_penetration_version USING btree (offer_type);

--changeset sriraj.varanasi@impactanalytics.co:adding_column_l0_id stripComments:false splitStatements:false context:Release_1_0 labels:adding_column_l0_id
--comment: adding_column_l0_id
ALTER TABLE price_promo_opt.tb_offer_type_penetration_version
ADD COLUMN l0_id int4 NULL;