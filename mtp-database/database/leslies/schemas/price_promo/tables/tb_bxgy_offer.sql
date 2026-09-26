--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_bxgy_offer stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_bxgy_offer

CREATE TABLE price_promo.tb_bxgy_offer (
    bxgy_offer_id serial4 NOT NULL,
	bxgy_offer_name varchar NOT NULL,
	total_number_of_units int4 NOT NULL,
	promo_id int4 NULL,
    discount_value int4 NULL,
    bxgy_offer_type_id int4 NULL,
    created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
    CONSTRAINT tb_bxgy_offer_pkey PRIMARY KEY (bxgy_offer_id),
    CONSTRAINT tb_bxgy_offer_bxgy_offer_type_fk FOREIGN KEY (bxgy_offer_type_id) REFERENCES price_promo.tb_bxgy_offer_type(bxgy_offer_type_id),
    CONSTRAINT tb_bxgy_offer_promo_fk FOREIGN KEY (promo_id) REFERENCES price_promo.promo_master(promo_id)
);


--changeset shrrayan.sheel@impactanalytics.co:tb_bxgy_offer_141020251512 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: changing discount value to float8
ALTER TABLE price_promo.tb_bxgy_offer
ALTER COLUMN discount_value TYPE float8;