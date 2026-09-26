--liquibase formatted sql
--changeset sreevathsa.sp:tb_store_split_opt_version_20251229 stripComments:false splitStatements:false context:Release_1_0 labels:price_promo_opt
--comment: Create tb_store_split_opt_version table for storing store split optimization data
--rollback: SELECT 1;

CREATE TABLE price_promo_opt.tb_store_split_opt_version (
    l3_cid int4 NOT NULL,
    l0_cid int4 NOT NULL,
    simulation_week_start_date date NOT NULL,
    store_reco_level text NOT NULL,
    store_split_ratio float8 NOT NULL,
    s0_id int4 NULL,
    s1_id int4 NULL,
    store_id int4 NOT NULL,
    version_code int4 NOT NULL,
    CONSTRAINT tb_store_split_opt_version_pk PRIMARY KEY (store_id, l0_cid, l3_cid, simulation_week_start_date, version_code)
)
PARTITION BY LIST (version_code);

CREATE INDEX idx_tb_store_split_opt_version_keys ON price_promo_opt.tb_store_split_opt_version USING btree (store_id, l0_cid, l3_cid, simulation_week_start_date);
CREATE INDEX tb_store_split_opt_version_store_id_idx ON price_promo_opt.tb_store_split_opt_version USING btree (store_id);
