--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_calculate_pcds_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_calculate_pcds
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_calculate_pcds;
CREATE OR REPLACE FUNCTION price_markdown.fn_calculate_pcds(p_calendar_config_id integer, p_start_date date, p_end_date date)
 RETURNS TABLE(pcd_start_date_ date, pcd_end_date_ date)
 LANGUAGE plpgsql
AS $function$
	declare
        _calendar_config_object price_markdown.tb_calendar_config%ROWTYPE;
	begin
        select * into _calendar_config_object
        from price_markdown.tb_calendar_config
        where calendar_config_id = p_calendar_config_id;

        raise notice 'pcd type: %',_calendar_config_object.pcd_type;

        if _calendar_config_object.pcd_type = 'Custom' then
            raise notice 'entered Custom';
            return query (select * from price_markdown.fn_calculate_custom_config_pcd(p_calendar_config_id,p_start_date,p_end_date));
        else
            return query (select * from price_markdown.fn_calculate_frequency_based_pcd(p_calendar_config_id,p_start_date,p_end_date));
        end if;
    end;
$function$
;
