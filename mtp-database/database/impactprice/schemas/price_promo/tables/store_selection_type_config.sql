--liquibase formatted sql
--changeset liquibase:store_selection_type_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_selection_type_config
CREATE TABLE price_promo.store_selection_type_config (
	id int4 NOT NULL,
	store_selection_type price_promo."store_selection_type_enum" NULL,
	store_selection_sub_type price_promo."store_selection_sub_type_enum" NULL,
	CONSTRAINT store_selection_type_config_id_check CHECK ((id = ANY (ARRAY[1, 2, 3, 4, 5, 6, 7]))),
	CONSTRAINT store_selection_type_config_pkey PRIMARY KEY (id),
	CONSTRAINT store_selection_type_config_ukey UNIQUE (id, store_selection_type, store_selection_sub_type)
);
CREATE INDEX idx_store_selection_id ON price_promo.store_selection_type_config USING btree (id);