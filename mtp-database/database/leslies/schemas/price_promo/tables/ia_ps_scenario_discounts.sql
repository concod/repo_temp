--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_advertised_type_config  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.ia_ps_scenario_discounts
--rollback: RENAME TABLE price_promo.ia_ps_discount_scenarios TO price_promo.ia_ps_scenario_discounts;


CREATE TABLE price_promo.ia_ps_scenario_discounts (
    id bigserial NOT NULL,
    promo_id int4 NOT NULL,
    scenario_id int4 NOT NULL,
    discount_level_value int8 DEFAULT 0 NOT NULL,
    offer_type_id int4 NULL,
    offer_type varchar(100) NULL,
    offer_x_value float8 NULL,
    offer_x_type varchar(100) NULL,
    offer_y_value float8 NULL,
    offer_y_type varchar(100) NULL,
    offer_z_value float8 NULL,
    tier_id int4 NULL,
    offer_type_combined_display_name varchar(100) NULL,
    created_by int4 NOT NULL,
    created_at timestamptz NOT NULL,
    offer_z_type varchar NULL,
    CONSTRAINT ia_ps_scenario_discounts_pkey PRIMARY KEY (id),
    CONSTRAINT ia_ps_scenario_discounts_ukey UNIQUE (promo_id, scenario_id, discount_level_value)
);
    
-- Create indexes
CREATE INDEX promo_scenario_id_idx_iapssd 
    ON price_promo.ia_ps_scenario_discounts USING btree (promo_id, scenario_id);


