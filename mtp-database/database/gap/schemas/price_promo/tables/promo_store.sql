--liquibase formatted sql
--changeset liquibase:promo_store_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_store - added partition
CREATE TABLE price_promo.promo_store (
	promo_id int4 NOT NULL,
	store_id int8 NOT NULL,
	store_name varchar NOT NULL,
	"uuid" uuid DEFAULT uuid_generate_v1() NOT NULL,
	CONSTRAINT promo_store_pkey PRIMARY KEY (promo_id, store_id)
)
PARTITION BY LIST (promo_id);