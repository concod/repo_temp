--liquibase formatted sql
--changeset shreyansh.pathak@impactanalytics.co:create_w2d_contribution_basedata runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for item_smart.create_w2d_contribution_basedata
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.create_w2d_contribution_basedata();
CREATE OR REPLACE PROCEDURE item_smart.create_w2d_contribution_basedata()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
begin
    
truncate table item_smart.w2d_contribution_basedata;
INSERT INTO item_smart.w2d_contribution_basedata (channel, hierarchy_code, current_week, delivered_week, delivered_rates)
SELECT channel, hierarchy_code, current_week, delivered_week, delivered_rates
FROM public.w2d_contribution_basedata;

END;
$procedure$;