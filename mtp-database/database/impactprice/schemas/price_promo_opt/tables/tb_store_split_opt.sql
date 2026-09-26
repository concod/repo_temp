--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:tb_store_split_opt_add_pk_partition_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: add primary key, convert to partitioned table, and add index for tb_store_split_opt
DROP table if exists price_promo_opt.tb_store_split_opt;

CREATE TABLE price_promo_opt.tb_store_split_opt (
	l3_cid int4 NOT NULL,
	l0_cid int4 NOT NULL,
	simulation_week_start_date date NOT NULL,
	store_reco_level text NOT NULL,
	store_split_ratio float8 NOT NULL,
	s0_id int4 NULL,
	s1_id int4 NULL,
	store_id int4 NOT NULL,
	CONSTRAINT tb_store_split_opt_pk PRIMARY KEY (l0_cid, l3_cid, store_id, simulation_week_start_date)
)
PARTITION BY RANGE (simulation_week_start_date);
CREATE INDEX idx_prd_cid_simweekstart_opt ON price_promo_opt.tb_store_split_opt USING btree (l0_cid, l3_cid, simulation_week_start_date);
