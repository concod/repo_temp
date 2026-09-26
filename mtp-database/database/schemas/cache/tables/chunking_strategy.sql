--liquibase formatted sql
--changeset liquibase:chunking_strategy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for chunking_strategy
CREATE TABLE "cache".chunking_strategy (
	"function" varchar NOT NULL,
	pl int4 NULL,
	sl int4 NULL,
	tl int4 NULL,
	ph _varchar NOT NULL DEFAULT '{}'::character varying[],
	sh _varchar NOT NULL DEFAULT '{}'::character varying[],
	th _varchar NOT NULL DEFAULT '{}'::character varying[],
	CONSTRAINT chunking_strategy_un UNIQUE (function)
);



--changeset kailash.yadav:chunking_strategy stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for chunking_strategy

INSERT INTO "cache".chunking_strategy ("function", pl, sl, tl, ph, sh, th) VALUES('ada_visual_predictions', 1, 0, 0, '{common,product_bucket_code}', '{}', '{fiscal_year_week}');
