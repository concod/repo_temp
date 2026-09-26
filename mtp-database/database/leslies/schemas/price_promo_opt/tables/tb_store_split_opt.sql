--liquibase formatted sql
    --changeset vaibhav.singh@impactanalytics.co:store_split_opt_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for store_split_opt

--    CREATE TABLE price_promo_opt.tb_store_split_opt (
--        l3_cid INTEGER NOT NULL,
--        brand_cid INTEGER NOT NULL,
--        store_id INTEGER NOT NULL,
--        s0_id INTEGER NOT NULL,
--        s1_id INTEGER NOT NULL,
--        week_start_date DATE NOT NULL,
--        store_split_ratio FLOAT
--    ) PARTITION BY RANGE (week_start_date);
--
--    CREATE INDEX idx_l3cid_brandcid_weekstartdate_opt ON
--    price_promo_opt.tb_store_split_opt
--    USING BTREE (l3_cid, brand_cid, week_start_date);
DROP Table if exists price_promo_opt.tb_store_split_opt;

CREATE TABLE price_promo_opt.tb_store_split_opt (
	l0_cid int4 NULL,
	l1_cid int4 NULL,
	l2_cid int4 NULL,
	l3_cid int4 NULL,
	store_id int4 NULL,
	c0_id int4 NULL,
	week_start_date date NULL,
	store_split_ratio float8 NULL
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_sso_week_store_c0_l ON price_promo_opt.tb_store_split_opt USING btree (week_start_date, store_id, c0_id, l0_cid, l1_cid, l2_cid, l3_cid) INCLUDE (store_split_ratio);
CREATE INDEX idx_tb_store_split_opt_l0_l1_l2_l3_store_c0_week ON price_promo_opt.tb_store_split_opt USING btree (l0_cid, l1_cid, l2_cid, l3_cid, store_id, c0_id, week_start_date);
CREATE INDEX idx_tb_store_split_opt_l3_store_c0_week ON price_promo_opt.tb_store_split_opt USING btree (l3_cid, store_id, c0_id, week_start_date);