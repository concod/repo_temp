--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_procedure_time_tracking stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_procedure_time_tracking

CREATE TABLE base_pricing_restaurant.bp_procedure_time_tracking (
	strategy_id int4 NOT NULL,
	"procedure" varchar(255) NOT NULL,
	start_date timestamp NOT NULL,
	end_date timestamp NOT NULL,
	time_taken interval NOT NULL
);