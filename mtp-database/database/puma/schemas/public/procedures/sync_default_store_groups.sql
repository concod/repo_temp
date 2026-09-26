--liquibase formatted sql
--changeset shekharkrishna.nirnakar@impactanalytcs:sync_default_store_groups runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_default_store_groups
--comment: initial changeset for sync_default_store_groups
DROP PROCEDURE IF EXISTS public.sync_default_store_groups();
CREATE OR REPLACE PROCEDURE public.sync_default_store_groups()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
_sg_code global.store_groups.sg_code%type;
begin
select sg_code
into _sg_code
from global.store_groups sg where name ='Default Outlet' and is_deleted= false;
insert into global.store_groups_mapping
(sg_code, store_code )
select _sg_code, saf.store_code
from global.store_attributes_filter saf
where
1=1
and saf.active =true
and saf.future_stores =false
and channel ='Outlet'
and not exists (select 'p' from global.store_groups_mapping sgm
where saf.store_code =sgm.store_code
and sgm.sg_code =_sg_code
);
delete from global.store_groups_mapping sgm
where exists (
select 'p' from global.store_attributes_filter saf
where
1=1
and saf.active =false
and sgm.store_code =saf.store_code
and channel ='Outlet'
and future_stores=false
)
and sgm.sg_code =_sg_code;
end
$procedure$
;