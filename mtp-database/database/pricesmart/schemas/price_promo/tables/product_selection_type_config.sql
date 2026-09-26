--liquibase formatted sql
--changeset liquibase:product_selection_type_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_selection_type_config

CREATE TABLE price_promo.product_selection_type_config (
	id int4 NOT NULL,
	product_selection_type price_promo."product_selection_type_enum" NULL,
	product_selection_sub_type price_promo."product_selection_sub_type_enum" NULL,
	CONSTRAINT product_selection_type_config_id_check CHECK ((id = ANY (ARRAY[1, 2, 3, 4, 5, 6, 7]))),
	CONSTRAINT product_selection_type_config_pkey PRIMARY KEY (id),
	CONSTRAINT product_selection_type_config_ukey UNIQUE (id, product_selection_type, product_selection_sub_type)
);
CREATE INDEX idx_product_selection_id ON price_promo.product_selection_type_config USING btree (id);

