--liquibase formatted sql
--changeset ashish@impactanalytics.co:extensions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for extensions

CREATE EXTENSION IF NOT EXISTS btree_gist schema public;
CREATE EXTENSION IF NOT EXISTS pg_prewarm schema public;
CREATE EXTENSION IF NOT EXISTS tablefunc schema public;
CREATE EXTENSION IF NOT EXISTS dblink schema public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" schema public;

--changeset ashish@impactanalytics.co:vector_extensions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vector_extensions
CREATE EXTENSION IF NOT EXISTS vector schema public;

--changeset ashish@impactanalytics.co:citext_extensions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for citext_extensions
CREATE EXTENSION IF NOT EXISTS citext schema public;

--changeset ashish@impactanalytics.co:pg_stat_statements_extensions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pg_stat_statements_extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements schema public;

--changeset ashish@impactanalytics.co:unaccent_extensions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for unaccent_extensions
CREATE EXTENSION IF NOT EXISTS unaccent schema public;

--changeset ashish@impactanalytics.co:postgres_fdw_extensions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for postgres_fdw_extensions
CREATE EXTENSION IF NOT EXISTS postgres_fdw schema public;


--changeset akshayjain@impactanalytics.co:postgres_fdw_extensions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto schema public;