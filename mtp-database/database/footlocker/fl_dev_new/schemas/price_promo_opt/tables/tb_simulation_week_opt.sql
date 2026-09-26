--liquibase formatted sql
--changeset divyasree.bingimalla@impactanalytics.co:tb_simulation_week_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_simulation_week_opt


CREATE TABLE price_promo_opt.tb_simulation_week_opt (
	product_id int4 NOT NULL,
	simulation_week_start_date date NOT NULL,
	base_percentage int4 NULL,
	sales_units float8 NULL,
	baseline_sales_units float8 NULL,
	elasticity float8 NULL,
	s0_id int4 NULL,
	s1_id int4 NULL
)
PARTITION BY RANGE (simulation_week_start_date);
CREATE INDEX idx_product_basepercentage ON price_promo_opt.tb_simulation_week_opt (product_id,base_percentage);

--changeset liquibase:add_constraint_week_opt stripComments:false splitStatements:false context:Release_1_0
--comment: Adding constraint simulation_week_opt

ALTER TABLE price_promo_opt.tb_simulation_week_opt
ADD CONSTRAINT pk_simulation_week_opt 
PRIMARY KEY (product_id, simulation_week_start_date, s0_id, s1_id, base_percentage);