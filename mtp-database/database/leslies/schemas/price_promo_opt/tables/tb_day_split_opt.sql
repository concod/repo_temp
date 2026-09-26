--liquibase formatted sql
    --changeset vaibhav.singh@impactanalytics.co:day_split_opt_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for day_split_opt

--    CREATE TABLE price_promo_opt.tb_day_split_opt (
--        l3_cid INTEGER NOT NULL,
--        brand_cid INTEGER NOT NULL,
--        date DATE NOT NULL,
--        week_start_date DATE NOT NULL,
--        bnm_day_split_ratio FLOAT,
--        ecom_day_split_ratio FLOAT
--    ) PARTITION BY RANGE (week_start_date);
--
--    CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_opt ON
--    price_promo_opt.tb_day_split_opt
--    USING BTREE (l3_cid, brand_cid, week_start_date);



DROP TABLE if exists price_promo_opt.tb_day_split_opt;
CREATE TABLE price_promo_opt.tb_day_split_opt (
	l0_cid int4 NULL,
	l1_cid int4 NULL,
	l2_cid int4 NULL,
	l3_cid int4 NULL,
	s0_id int4 NULL,
	c0_id int4 NULL,
	"date" date NULL,
	day_split_ratio float8 NULL
)
PARTITION BY RANGE (date);
CREATE INDEX idx_tb_day_split_opt_l0_l1_l2_l3_s0_c0_date ON price_promo_opt.tb_day_split_opt USING btree (l0_cid, l1_cid, l2_cid, l3_cid, s0_id, c0_id, date);