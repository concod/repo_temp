--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:jsonb_recursive_merge runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for jsonb_recursive_merge

drop function if exists price_promo.jsonb_recursive_merge;
CREATE OR REPLACE FUNCTION price_promo.jsonb_recursive_merge(A jsonb, B jsonb) 
RETURNS jsonb 
LANGUAGE SQL 
AS $$
    SELECT 
    jsonb_object_agg( 
    coalesce(ka, kb), 
    CASE 
    WHEN va isnull THEN vb 
    WHEN vb isnull THEN va 
    WHEN jsonb_typeof(va) <> 'object' OR jsonb_typeof(vb) <> 'object' THEN vb 
    ELSE price_promo.jsonb_recursive_merge(va, vb) END 
    ) 
    FROM jsonb_each(A) temptable1(ka, va)
    FULL JOIN jsonb_each(B) temptable2(kb, vb) ON ka = kb 
$$;