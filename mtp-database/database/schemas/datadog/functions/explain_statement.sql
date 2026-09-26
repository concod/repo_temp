--liquibase formatted sql
--changeset ashish@impactanalytics.co:explain_statement stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:datadog
--comment: initial changeset for datadog
DROP FUNCTION if exists datadog.explain_statement;
CREATE OR REPLACE FUNCTION datadog.explain_statement(
   l_query TEXT,
   OUT explain JSON
)
RETURNS SETOF JSON AS
$$
DECLARE
curs REFCURSOR;
plan JSON;
BEGIN
   OPEN curs FOR EXECUTE pg_catalog.concat('EXPLAIN (FORMAT JSON) ', l_query);
   FETCH curs INTO plan;
   CLOSE curs;
   RETURN QUERY SELECT plan;
END;
$$
LANGUAGE 'plpgsql'
RETURNS NULL ON NULL INPUT
SECURITY DEFINER;
