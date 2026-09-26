--liquibase formatted sql
--changeset liquibase:date_restriction stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for date_restriction

CREATE TYPE price_promo.date_restriction AS (
	same_as_event bool,
	min_promotion_days int4,
	max_promotion_days int4,
	promotion_start_day date,
	promotion_end_day date);