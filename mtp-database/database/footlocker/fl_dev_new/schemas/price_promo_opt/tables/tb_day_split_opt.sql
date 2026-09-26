--liquibase formatted sql
--changeset divyasree.bingimalla@impactanalytics.co:tb_day_split_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_day_split_opt

CREATE TABLE price_promo_opt.tb_day_split_opt (
	l3_cid int4 NOT NULL,
	l0_cid int4 NOT NULL,
	s0_id int4 NOT NULL,
	s1_id int4 NOT NULL,
	"date" date NOT NULL,
	simulation_week_start_date date NOT NULL,
	day_split_ratio float8 NULL
)
PARTITION BY RANGE (date);
CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_opt ON price_promo_opt.tb_day_split_opt USING btree (l3_cid, l0_cid, s0_id, s1_id, "date");

--changeset liquibase:add_constraint_day_opt stripComments:false splitStatements:false context:Release_1_0
--comment: Adding constraint day_split_opt

ALTER TABLE price_promo_opt.tb_day_split_opt
ADD CONSTRAINT pk_day_split_opt 
PRIMARY KEY (l0_cid, l3_cid, s0_id, s1_id, date);