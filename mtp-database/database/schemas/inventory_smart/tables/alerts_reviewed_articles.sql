--liquibase formatted sql
--changeset liquibase:alerts_reviewed_articles_1 stripComments:false splitStatements:false context:MTP-98006 labels:MTP-98006
--comment: initial changeset for alerts_reviewed_articles

CREATE TABLE IF NOT EXISTS inventory_smart.alerts_reviewed_articles (
	article varchar NOT NULL,
	alert_key varchar NOT NULL,
	created_at timestamp DEFAULT now(),
	CONSTRAINT alerts_reviewed_articles_pkey PRIMARY KEY (article, alert_key)
);



--changeset liquibase:alerts_reviewed_articles_9 stripComments:false splitStatements:false context:MTP-115884 labels:MTP-115884
--comment: added channel column to table keeping default as none - review
ALTER TABLE inventory_smart.alerts_reviewed_articles 
ADD COLUMN channel varchar DEFAULT 'NONE'::character varying NOT NULL;

--changeset liquibase:alerts_reviewed_articles_93 stripComments:false splitStatements:false context:MTP-115884 labels:MTP-115884
--comment: added primary key constraint on article, alert_key
ALTER TABLE inventory_smart.alerts_reviewed_articles 
DROP CONSTRAINT IF EXISTS alerts_reviewed_articles_pkey;

ALTER TABLE inventory_smart.alerts_reviewed_articles
ADD CONSTRAINT alerts_reviewed_articles_pkey PRIMARY KEY (article, alert_key, channel);

--changeset liquibase:alerts_reviewed_articles_333 stripComments:false splitStatements:false context:MTP-115884 labels:MTP-generalise
--comment: generalise channel to review_level for generic review dimension support generalise
ALTER TABLE inventory_smart.alerts_reviewed_articles 
DROP CONSTRAINT IF EXISTS alerts_reviewed_articles_pkey;

ALTER TABLE inventory_smart.alerts_reviewed_articles 
RENAME COLUMN channel TO review_level;

ALTER TABLE inventory_smart.alerts_reviewed_articles
ADD CONSTRAINT alerts_reviewed_articles_pkey PRIMARY KEY (article, alert_key, review_level);

--changeset liquibase:alerts_reviewed_articles_2 stripComments:false splitStatements:false context:MTP-115884 labels:MTP-115884
--comment: adding channel to review articles on article+channel level
ALTER TABLE inventory_smart.alerts_reviewed_articles 
DROP CONSTRAINT alerts_reviewed_articles_pkey;