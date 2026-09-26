--liquibase formatted sql
--changeset liquibase:tb_offer_distributor_channel_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_offer_distributor_channel_config
CREATE TABLE price_promo.tb_offer_distributor_channel_config (
	id int4 NOT NULL,
	channel price_promo."offer_distributor_channel_enum" NULL,
	CONSTRAINT tb_offer_distributor_channel_config_id_check CHECK ((id = ANY (ARRAY[0, 1]))),
	CONSTRAINT tb_offer_distributor_channel_config_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_offer_distributor_channel_id ON price_promo.tb_offer_distributor_channel_config USING btree (id);