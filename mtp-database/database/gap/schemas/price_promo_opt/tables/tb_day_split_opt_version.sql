--liquibase formatted sql
--changeset sreevathsa.sp:tb_day_split_opt_version_20251229 stripComments:false splitStatements:false context:Release_1_0 labels:price_promo_opt
--comment: Create tb_day_split_opt_version table for storing day split optimization data
--rollback: SELECT 1;

CREATE TABLE price_promo_opt.tb_day_split_opt_version (
	l3_cid int4 NOT NULL,
	"date" date NOT NULL,
	simulation_week_start_date date NOT NULL,
	day_split_ratio float8 NULL,
	l0_cid int4 NOT NULL DEFAULT 1,
	s0_id int4 NOT NULL DEFAULT 1,
	s1_id int4 NOT NULL DEFAULT 1,
	version_code int4 NOT NULL,
	CONSTRAINT pk_day_split_opt_version PRIMARY KEY (version_code, l0_cid, l3_cid, s0_id, s1_id, date)
)
PARTITION BY LIST (version_code);