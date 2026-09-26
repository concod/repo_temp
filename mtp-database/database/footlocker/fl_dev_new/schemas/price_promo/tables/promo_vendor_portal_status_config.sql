--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:promo_vendor_portal_status_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_vendor_portal_status_config

CREATE TABLE price_promo.promo_vendor_portal_status_config (
	status_id int4 NOT NULL,
	status_name price_promo."promo_vendor_portal_status_name_enum" NULL,
	display_order int2 NULL,
	CONSTRAINT promo_vendor_portal_status_config_pkey PRIMARY KEY (status_id),
	CONSTRAINT promo_vendor_portal_status_config_status_id_check CHECK ((status_id = ANY (ARRAY[0, 1, 2, 3, 4, 5, 6]))),
	CONSTRAINT promo_vendor_portal_status_config_ukey UNIQUE (status_id, status_name)
);
CREATE INDEX idx_promo_vendor_portal_status_id ON price_promo.promo_vendor_portal_status_config USING btree (status_id); 
