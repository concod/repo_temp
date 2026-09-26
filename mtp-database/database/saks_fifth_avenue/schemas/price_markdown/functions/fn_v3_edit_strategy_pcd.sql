--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_edit_strategy_pcd runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_v3_edit_strategy_pcd

DROP FUNCTION if exists price_markdown.fn_v3_edit_strategy_pcd;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_edit_strategy_pcd(p_strategy_id integer, p_start_date date, p_end_date date, p_calendar_config_id integer, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
	_created_by int;
	_created_at timestamptz;
begin
	select 
		created_by, created_at
		into _created_by, _created_at
    from 
		price_markdown.tb_strategy_pcd
    where 
		strategy_id in(p_strategy_id)
    	limit 1;
  
   
	delete from price_markdown.tb_strategy_pcd where strategy_id = p_strategy_id;

    insert into price_markdown.tb_strategy_pcd
    (strategy_id,pcd_start_date,pcd_end_date,created_by, created_at)
    select 
		p_strategy_id,
		pcd_start_date_,
		pcd_end_date_,
		p_user_id, 
		now()
    from 
		price_markdown.fn_v3_calculate_pcds(p_calendar_config_id, p_start_date, p_end_date);
   

   	if _created_by is not null and _created_at is not null then
   		update 
   			price_markdown.tb_strategy_pcd
		set
		    created_by = _created_by,
		    created_at = _created_at,
		    updated_by = p_user_id,
		    updated_at = now()                              
		where 
		    strategy_id = p_strategy_id;
   	end if;
   
    return p_strategy_id;
END;
$function$
;
