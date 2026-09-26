--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:generate_wholesale_reports_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38204
--comment: initial changeset for generate_wholesale_reports
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS plan_smart.generate_wholesale_reports(IN plan_version text, IN channels text[]);
CREATE OR REPLACE PROCEDURE plan_smart.generate_wholesale_reports(IN plan_version text, IN channels text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
 v_sql               text;
 channel             text;
 v_affected_rows     int4;
 tgt_tbl_name        text;
 src_tbl_name        text;
 v_start_week        int4;
begin
  
 if plan_version in ('WF')
 then
   select 
     fiscal_year_week 
   into
     v_start_week 
   from 
     global.fiscal_date_mapping 
   where 
     calendar_date = date(current_date) ;
 else
   select 
     max(fiscal_year_week) 
   into
     v_start_week      
   from 
     global.fiscal_date_mapping 
   where 
     fiscal_year_week::text =  (select to_char(current_date,'YYYY')||'01'::text );
 end if;

  v_sql := 'drop table if exists public.paf_l3_wholesale';
  execute v_sql;
  v_sql := 'create table public.paf_l3_wholesale as
            select l0_name,l1_name,l2_name,l3_name
              from "global".product_attributes_filter paf  
             where business_unit = ''Wholesale''
            group by l0_name,l1_name,l2_name,l3_name';
  execute v_sql;
  v_sql := 'drop table if exists public.lines_wholesale';
  execute v_sql;   
  v_sql := 'create table public.lines_wholesale as  
            (select * from
            (select hierarchy_code,l0_name,l1_name,l2_name,l3_name 
            from plan_smart.product_hierarchies_filter where level = 4) phf
            inner join paf_l3_wholesale
            using (l0_name,l1_name,l2_name,l3_name)
            )';
  execute v_sql; 
  
  v_sql := 'create index idx_lines_wholesale on lines_wholesale(hierarchy_code)'; 
  execute v_sql;

  v_sql := 'analyze lines_wholesale';
  execute v_sql;
 
  select
    case 
   when plan_version = 'WP' then 'plan_smart.wp_wholesale_report'
     when plan_version = 'WF' then 'plan_smart.wf_wholesale_report'
     when plan_version = 'OP' then 'plan_smart.op_wholesale_report'
     when plan_version = 'LF' then 'plan_smart.lf_wholesale_report'
    end
  into tgt_tbl_name;
 
  v_sql := 'truncate table '||tgt_tbl_name;
 
  execute v_sql;
 
  select
    case 
   when plan_version = 'WP' then 'wp_master_1'
     when plan_version = 'WF' then 'wf_master_1'
     when plan_version = 'OP' then 'op_master_1'
     when plan_version = 'LF' then 'lf_master_1'
    end
  into src_tbl_name;  
 
foreach channel in array channels
loop
if exists (select * 
             from pg_catalog.pg_tables 
           where tablename = src_tbl_name||'_'||lower(regexp_replace(channel, '[ /.-]', '', 'g') ) 
          )
then  
v_sql := '  
insert into '||tgt_tbl_name||'
select
    "Timestamp",
    "BU",
    "Group",
    "Customer",
    "Division",
    "Department",
    "Class",
    case 
      when "Line" = ''99 - Default Line #'' 
      then ''99 - Default Line '' 
    else "Line" 
    end as "Line",
   case 
      when fiscal_month_in_year = 1 then ''JAN''
      when fiscal_month_in_year = 2 then ''FEB''
      when fiscal_month_in_year = 3 then ''MAR''
      when fiscal_month_in_year = 4 then ''APR''
      when fiscal_month_in_year = 5 then ''MAY''
      when fiscal_month_in_year = 6 then ''JUN''
      when fiscal_month_in_year = 7 then ''JUL''
      when fiscal_month_in_year = 8 then ''AUG''
      when fiscal_month_in_year = 9 then ''SEP''
      when fiscal_month_in_year = 10 then ''OCT''
      when fiscal_month_in_year = 11 then ''NOV''
      when fiscal_month_in_year = 12 then ''DEC'' 
    end as
    fiscal_month_in_year,
    fiscal_year,
sum("Comp Sls U") as "Comp Sls U",
sum("NComp Sls U") as "NComp Sls U",
sum("Ttl Sls U") as "Ttl Sls U",
sum("Comp Sls $") as "Comp Sls $",
sum("NComp Sls $") as "NComp Sls $",
sum("Ttl Sls $") as "Ttl Sls $",
sum("Comp AUR") AS "Comp AUR",
sum("NComp AUR") AS "NComp AUR",
sum("Ttl AUR") AS "Ttl AUR",
COALESCE(SUM("Comp Sls $") / NULLIF(SUM("Comp Sls U"), 0), 0) AS "Comp AUP",
COALESCE(SUM("Ttl Sls $") / NULLIF(SUM("Ttl Sls U"), 0), 0) AS "Ttl AUP",
sum("Comp COGS") as "Comp COGS",
sum("NComp COGS") as "NComp COGS",
sum("Ttl COGS") as "Ttl COGS",
sum("Comp Adj Cst") as "Comp Adj Cst",
sum("NComp Adj Cst") as "NComp Adj Cst",
sum("Ttl Adj Cst") as "Ttl Adj Cst",
sum("Comp COGS.") as "Comp COGS.",
sum("Ttl COGS.") as "Ttl COGS.",
sum("Comp AUC") AS "Comp AUC",
sum("NComp AUC") AS "NComp AUC",
sum("Ttl AUC") AS "Ttl AUC",
sum("Comp Adj AUC") as "Comp Adj AUC",
sum("NComp Adj AUC") as "NComp Adj AUC",
sum("Ttl Adj AUC") as "Ttl Adj AUC",
COALESCE(SUM("Comp COGS.") / NULLIF(SUM("Comp Sls U"), 0), 0) AS "Comp AULC",
COALESCE(SUM("Ttl COGS.") / NULLIF(SUM("Ttl Sls U"), 0), 0) AS "Ttl AULC",
CASE
     WHEN lag(sum("Comp Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) IS NULL THEN 0
     WHEN lag(sum("Comp Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) = 0 then 0
     ELSE sum("Comp Sls U") / lag(sum("Comp Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year)
    END AS "Comp Sls U Build",
CASE
     WHEN lag(sum("NComp Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) IS NULL THEN 0
     WHEN lag(sum("NComp Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) = 0 then 0
     ELSE sum("NComp Sls U") / lag(sum("NComp Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year)
    END AS "NComp Sls U Build",
CASE
     WHEN lag(sum("Ttl Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) IS NULL THEN 0
     WHEN lag(sum("Ttl Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) = 0 then 0
     ELSE sum("Ttl Sls U") / lag(sum("Ttl Sls U")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year)
    END AS "Ttl Sls U Build",
CASE
     WHEN lag(sum("Comp Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) IS NULL THEN 0
     WHEN lag(sum("Comp Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) = 0 then 0
     ELSE sum("Comp Sls $") / lag(sum("Comp Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year)
    END AS "Comp Sls $ Build",
CASE
     WHEN lag(sum("NComp Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) IS NULL THEN 0
     WHEN lag(sum("NComp Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) = 0 then 0
     ELSE sum("NComp Sls $") / lag(sum("NComp Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year)
    END AS "NComp Sls $ Build",
CASE
     WHEN lag(sum("Ttl Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) IS NULL THEN 0
     WHEN lag(sum("Ttl Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year) = 0 then 0
     ELSE sum("Ttl Sls $") / lag(sum("Ttl Sls $")) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY fiscal_month_in_year)
    END AS "Ttl Sls $ Build",
sum("Comp GM $") as "Comp GM $",
sum("NComp GM $") as "NComp GM $",
sum("Ttl GM $") as "Ttl GM $",
COALESCE(SUM("Comp GM $") / NULLIF(SUM("Comp Sls $"), 0), 0) AS "Comp GM %",
COALESCE(SUM("NComp GM $") / NULLIF(SUM("NComp Sls $"), 0), 0) AS "NComp GM %",
COALESCE(SUM("Ttl GM $") / NULLIF(SUM("Ttl Sls $"), 0), 0) AS "Ttl GM %",
sum("Comp Adj GM $") as "Comp Adj GM $",
sum("NComp Adj GM $") as "NComp Adj GM $",
sum("Ttl Adj GM $") as "Ttl Adj GM $",
sum("Comp Adj GM %") as "Comp Adj GM %",
sum("NComp Adj GM %") as "NComp Adj GM %",
sum("Ttl Adj GM %") as "Ttl Adj GM %",
sum("Comp GMROI") as "Comp GMROI",
sum("NComp GMROI") as "NComp GMROI",
sum("Ttl GMROI") as "Ttl GMROI",
sum("Comp Svc Lvl") as "Comp Svc Lvl",
sum("Ttl Svc Lvl") as "Ttl Svc Lvl",
sum("Comp Qty Shp") as "Comp Qty Shp",
sum("Ttl Qty Shp") as "Ttl Qty Shp",
sum("Comp Qty Ord") as "Comp Qty Ord",
sum("Ttl Qty Ord") as "Ttl Qty Ord",
avg("Comp BOH U") as "Comp BOH U",
sum("NComp BOH U") as "NComp BOH U",
sum("Ttl BOH U") as "Ttl BOH U",
sum("Comp BOH Cst") as "Comp BOH Cst",
sum("NComp BOH Cst") as "NComp BOH Cst",
sum("Ttl BOH Cst") as "Ttl BOH Cst",
sum("Comp BOH LCst") as "Comp BOH LCst",
sum("Ttl BOH LCst") as "Ttl BOH LCst",
sum("Comp BOH AUC") as "Comp BOH AUC",
sum("NComp BOH AUC") as "NComp BOH AUC",
sum("Ttl BOH AUC") as "Ttl BOH AUC",
sum("Comp BOH AULC") as "Comp BOH AULC",
sum("Ttl BOH AULC") as "Ttl BOH AULC",
sum("Comp EOH U") as "Comp EOH U",
sum("NComp EOH U") as "NComp EOH U",
sum("Ttl EOH U") as "Ttl EOH U",
sum("Comp EOH Cst") as "Comp EOH Cst",
sum("NComp EOH Cst") as "NComp EOH Cst",
sum("Ttl EOH Cst") as "Ttl EOH Cst",
sum("Comp EOH AUC") as "Comp EOH AUC",
sum("NComp EOH AUC") as "NComp EOH AUC",
sum("Ttl EOH AUC") as "Ttl EOH AUC",
sum("Comp EOH AULC") as "Comp EOH AULC",
sum("Ttl EOH AULC") as "Ttl EOH AULC",
sum("Comp Avg Inv") as "Comp Avg Inv",
sum("NComp Avg Inv") as "NComp Avg Inv",
sum("Ttl Avg Inv") as "Ttl Avg Inv",
sum("Comp ST%") as "Comp ST%",
sum("NComp ST%") as "NComp ST%",
sum("Ttl ST%") as "Ttl ST%",
sum("Comp WOS") as "Comp WOS",
sum("NComp WOS") as "NComp WOS",
sum("Ttl WOS") as "Ttl WOS",
sum("Comp In Stock %") as "Comp In Stock %",
sum("NComp In Stock %") as "NComp In Stock %",
sum("Ttl In Stock %") as "Ttl In Stock %",
sum("Comp Rct U") as "Comp Rct U",
sum("NComp Rct U") as "NComp Rct U",
sum("Ttl Rct U") as "Ttl Rct U",
sum("Comp Rct Cst") as "Comp Rct Cst",
sum("NComp Rct Cst") as "NComp Rct Cst",
sum("Ttl Rct Cst") as "Ttl Rct Cst",
sum("Comp Rct LCst") as "Comp Rct LCst",
sum("Ttl Rct LCst") as "Ttl Rct LCst",
sum("Comp Rct AUC") as "Comp Rct AUC",
sum("NComp Rct AUC") as "NComp Rct AUC",
sum("Ttl Rct AUC") as "Ttl Rct AUC",
sum("Comp Rct AULC") as "Comp Rct AULC",
sum("Ttl Rct AULC") as "Ttl Rct AULC",
sum("Comp CH Est Res U") as "Comp CH Est Res U",
sum("Ttl CH Est Res U") as "Ttl CH Est Res U",
sum("Comp CH Est Res LCst") as "Comp CH Est Res LCst",
sum("Ttl CH Est Res LCst") as "Ttl CH Est Res LCst",
sum("Comp CH Est Res AULC") as "Comp CH Est Res AULC",
sum("Ttl CH Est Res AULC") as "Ttl CH Est Res AULC",
sum("Comp CH FULL U") as "Comp CH FULL U",
sum("Ttl CH FULL U") as "Ttl CH FULL U",
sum("Comp CH FULL LCst") as "Comp CH FULL LCst",
sum("Ttl CH FULL LCst") as "Ttl CH FULL LCst",
sum("Comp CH FULL AULC") as "Comp CH FULL AULC",
sum("Ttl CH FULL AULC") as "Ttl CH FULL AULC",
sum("Comp Var Res FULL U") as "Comp Var Res FULL U",
sum("Ttl Var Res FULL U") as "Ttl Var Res FULL U",
sum("Comp Var Res FULL LCst") as "Comp Var Res FULL LCst",
sum("Ttl Var Res FULL LCst") as "Ttl Var Res FULL LCst",
sum("Comp Turn U") as "Comp Turn U",
sum("NComp Turn U") as "NComp Turn U",
sum("Ttl Turn U") as "Ttl Turn U",
sum("Comp Turn Cst") as "Comp Turn Cst",
sum("NComp Turn Cst") as "NComp Turn Cst",
sum("Ttl Turn Cst") as "Ttl Turn Cst",
sum("Comp OO U (Com)") as "Comp OO U (Com)",
sum("NComp OO U (Com)") as "NComp OO U (Com)",
sum("Ttl OO U (Com)") as "Ttl OO U (Com)",
sum("Comp OO Cst (Com)") as "Comp OO Cst (Com)",
sum("NComp OO Cst (Com)") as "NComp OO Cst (Com)",
sum("Ttl OO Cst (Com)") as "Ttl OO Cst (Com)",
sum("Comp OO LCst (Com)") as "Comp OO LCst (Com)",
sum("Ttl OO LCst (Com)") as "Ttl OO LCst (Com)",
sum("Comp OO AUC (Com)") as "Comp OO AUC (Com)",
sum("NComp OO AUC (Com)") as "NComp OO AUC (Com)",
sum("Ttl OO AUC (Com)") as "Ttl OO AUC (Com)",
sum("Comp OO AULC (Com)") as "Comp OO AULC (Com)",
sum("Ttl OO AULC (Com)") as "Ttl OO AULC (Com)",
sum("Comp OO U (NCom)") as "Comp OO U (NCom)",
sum("NComp OO U (NCom)") as "NComp OO U (NCom)",
sum("Ttl OO U (NCom)") as "Ttl OO U (NCom)",
sum("Comp OO Cst (NCom)") as "Comp OO Cst (NCom)",
sum("NComp OO Cst (NCom)") as "NComp OO Cst (NCom)",
sum("Ttl OO Cst (NCom)") as "Ttl OO Cst (NCom)",
sum("Comp OO LCst (NCom)") as "Comp OO LCst (NCom)",
sum("Ttl OO LCst (NCom)") as "Ttl OO LCst (NCom)",
sum("Comp OO AUC (NCom)") as "Comp OO AUC (NCom)",
sum("NComp OO AUC (NCom)") as "NComp OO AUC (NCom)",
sum("Ttl OO AUC (NCom)") as "Ttl OO AUC (NCom)",
sum("Comp OO AULC (NCom)") as "Comp OO AULC (NCom)",
sum("Ttl OO AULC (NCom)") as "Ttl OO AULC (NCom)",
sum("Comp Inv Adj U") as "Comp Inv Adj U",
sum("NComp Inv Adj U") as "NComp Inv Adj U",
sum("Ttl Inv Adj U") as "Ttl Inv Adj U",
sum("Comp Inv Adj Cst") as "Comp Inv Adj Cst",
sum("NComp Inv Adj Cst") as "NComp Inv Adj Cst",
sum("Ttl Inv Adj Cst") as "Ttl Inv Adj Cst",
sum("Comp Inv Adj LCst") as "Comp Inv Adj LCst",
sum("Ttl Inv Adj LCst") as "Ttl Inv Adj LCst",
sum("Comp Inv Adj AUC") as "Comp Inv Adj AUC",
sum("NComp Inv Adj AUC") as "NComp Inv Adj AUC",
sum("Ttl Inv Adj AUC") as "Ttl Inv Adj AUC",
sum("Comp Inv Adj AULC") as "Comp Inv Adj AULC",
sum("Ttl Inv Adj AULC") as "Ttl Inv Adj AULC",
sum("Comp EOH U OP") as "Comp EOH U OP",
sum("Ttl EOH U OP") as "Ttl EOH U OP",
sum("Comp EOH U LF") as "Comp EOH U LF",
sum("Ttl EOH U LF") as "Ttl EOH U LF",
sum("Comp EOH Cst OP") as "Comp EOH Cst OP",
sum("NComp EOH Cst OP") as "NComp EOH Cst OP",
sum("Ttl EOH Cst OP") as "Ttl EOH Cst OP",
sum("Comp EOH LCst OP") as "Comp EOH LCst OP",
sum("Ttl EOH LCst OP") as "Ttl EOH LCst OP",
sum("Comp EOH Cst LF") as "Comp EOH Cst LF",
sum("NComp EOH Cst LF") as "NComp EOH Cst LF",
sum("Ttl EOH Cst LF") as "Ttl EOH Cst LF",
sum("Comp EOH LCst LF") as "Comp EOH LCst LF",
sum("Ttl EOH LCst LF") as "Ttl EOH LCst LF",
sum("Comp OTB $ (WF vs OP)") as "Comp OTB $ (WF vs OP)",
sum("NComp OTB $ (WF vs OP)") as "NComp OTB $ (WF vs OP)",
sum("Ttl OTB $ (WF vs OP)") as "Ttl OTB $ (WF vs OP)",
sum("Comp OTB $ (WF vs LF)") as "Comp OTB $ (WF vs LF)",
sum("NComp OTB $ (WF vs LF)") as "NComp OTB $ (WF vs LF)",
sum("Ttl OTB $ (WF vs LF)") as "Ttl OTB $ (WF vs LF)",
sum("Comp OTB LCst WF to OP") as "Comp OTB LCst WF to OP",
sum("Ttl OTB LCst WF to OP") as "Ttl OTB LCst WF to OP",
sum("Comp OTB LCst WF to LF") as "Comp OTB LCst WF to LF",
sum("Ttl OTB LCst WF to LF") as "Ttl OTB LCst WF to LF",
sum("Comp Store Instock Facings") as "Comp Store Instock Facings",
sum("NComp Store Instock Facings") as "NComp Store Instock Facings",
sum("Ttl Store Instock Facings") as "Ttl Store Instock Facings",
sum("Comp Store Total Facings") as "Comp Store Total Facings",
sum("NComp Store Total Facings") as "NComp Store Total Facings",
sum("Ttl Store Total Facings") as "Ttl Store Total Facings",
avg("Comp CH BOH U IMP") as "Comp CH BOH U IMP",
avg("Ttl CH BOH U IMP") as "Ttl CH BOH U IMP",
avg("Comp CH BOH LCst IMP") as "Comp CH BOH LCst IMP",
avg("Ttl CH BOH LCst IMP") as "Ttl CH BOH LCst IMP",
avg("Comp CH BOH Cst IMP") as "Comp CH BOH Cst IMP",
avg("Ttl CH BOH Cst IMP") as "Ttl CH BOH Cst IMP",
avg("Comp CH BOH U") as "Comp CH BOH U",
avg("Ttl CH BOH U") as "Ttl CH BOH U",
avg("Comp CH BOH Cst") as "Comp CH BOH Cst",
avg("Ttl CH BOH Cst") as "Ttl CH BOH Cst",
COALESCE(avg("Comp CH BOH LCst IMP") / NULLIF(avg("Comp CH BOH U IMP"), 0), 0) AS "Comp CH BOH AULC",
avg("Ttl CH EOH Cst") as "Ttl CH EOH Cst",
COALESCE(avg("Ttl CH BOH LCst IMP") / NULLIF(avg("Ttl CH BOH U IMP"), 0), 0) AS "Ttl CH BOH AULC",
avg("Comp CH EOH U IMP") as "Comp CH EOH U IMP",
avg("Ttl CH EOH U IMP") as "Ttl CH EOH U IMP",
avg("Comp CH EOH LCst IMP") as "Comp CH EOH LCst IMP",
avg("Ttl CH EOH LCst IMP") as "Ttl CH EOH LCst IMP",
avg("Comp CH EOH Cst IMP") as "Comp CH EOH Cst IMP",
avg("Ttl CH EOH Cst IMP") as "Ttl CH EOH Cst IMP",
avg("Comp CH EOH U") as "Comp CH EOH U",
avg("Ttl CH EOH U") as "Ttl CH EOH U",
avg("Comp CH EOH Cst") as "Comp CH EOH Cst",
COALESCE(avg("Comp CH EOH LCst IMP") / NULLIF(avg("Comp CH EOH U IMP"), 0), 0) AS "Comp CH EOH AULC",
COALESCE(avg("Ttl CH EOH LCst IMP") / NULLIF(avg("Ttl CH EOH U IMP"), 0), 0) AS "Ttl CH EOH AULC",
sum("Comp CH Est Res Rec %") as "Comp CH Est Res Rec %",
sum("Ttl CH Est Res Rec %") as "Ttl CH Est Res Rec %",
sum("Comp CH Est Res Rec U") as "Comp CH Est Res Rec U",
sum("Ttl CH Est Res Rec U") as "Ttl CH Est Res Rec U",
sum("Comp CH Est Res Rec Cst") as "Comp CH Est Res Rec Cst",
sum("Ttl CH Est Res Rec Cst") as "Ttl CH Est Res Rec Cst",
sum("Comp Est 3rd Pty Rec %") as "Comp Est 3rd Pty Rec %",
sum("Ttl Est 3rd Pty Rec %") as "Ttl Est 3rd Pty Rec %",
sum("Comp Est 3rd Pty Rec U") as "Comp Est 3rd Pty Rec U",
sum("Ttl Est 3rd Pty Rec U") as "Ttl Est 3rd Pty Rec U",
sum("Comp Est 3rd Pty Rec Cst") as "Comp Est 3rd Pty Rec Cst",
sum("Ttl Est 3rd Pty Rec Cst") as "Ttl Est 3rd Pty Rec Cst",
sum("Comp Est Bypass Rec %") as "Comp Est Bypass Rec %",
sum("Ttl Est Bypass Rec %") as "Ttl Est Bypass Rec %",
sum("Comp Est Bypass Rec U") as "Comp Est Bypass Rec U",
sum("Ttl Est Bypass Rec U") as "Ttl Est Bypass Rec U",
sum("Comp Est Bypass Rec Cst") as "Comp Est Bypass Rec Cst",
sum("Ttl Est Bypass Rec Cst") as "Ttl Est Bypass Rec Cst",
sum("Comp CH Ttl Rct U") as "Comp CH Ttl Rct U",
sum("Ttl CH Ttl Rct U") as "Ttl CH Ttl Rct U",
sum("Comp CH Ttl Rct Cst") as "Comp CH Ttl Rct Cst",
sum("Ttl CH Ttl Rct Cst") as "Ttl CH Ttl Rct Cst",
sum("Ttl EOH LCst") as "Ttl EOH LCst",
sum("Comp EOH LCst") as "Comp EOH LCst"    
from (
select
    "Timestamp",
    "BU",
    "Group",
    "Customer",
    "Division",
    "Department",
    "Class",
    "Line",
    current_week,
    fiscal_month_in_year,
    fiscal_year,
    kpi44 as "Comp Sls U",
    kpi43 as "NComp Sls U",
    kpi44 as "Ttl Sls U",
    kpi125 as "Comp Sls $",
    kpi124 as "NComp Sls $",
    kpi125 as "Ttl Sls $",
    kpi2 as "Comp AUR",
    kpi1 as "NComp AUR",
    kpi3 as "Ttl AUR",
    kpi213 as "Comp AUP",
    kpi213 as "Ttl AUP",
    kpi104 as "Comp COGS",
    kpi103 as "NComp COGS",
    kpi105 as "Ttl COGS",
    kpi248 as "Comp Adj Cst",
    kpi249 as "NComp Adj Cst",
    kpi250 as "Ttl Adj Cst",
    kpi216 as "Comp COGS.",
    kpi216 as "Ttl COGS.",
    kpi101 as "Comp AUC",
    kpi100 as "NComp AUC",
    kpi101 as "Ttl AUC",
    kpi4 as "Comp Adj AUC",
    kpi5 as "NComp Adj AUC",
    kpi6 as "Ttl Adj AUC",
    kpi212 as "Comp AULC",
    kpi212 as "Ttl AULC",
    kpi131 as "Comp Sls U Build",
    kpi130 as "NComp Sls U Build",
    kpi131 as "Ttl Sls U Build",
    kpi134 as "Comp Sls $ Build",
    kpi133 as "NComp Sls $ Build",
    kpi134 as "Ttl Sls $ Build",
    kpi128 as "Comp GM $",
    kpi127 as "NComp GM $",
    kpi128 as "Ttl GM $",
    kpi47 as "Comp GM %",
    kpi46 as "NComp GM %",
    kpi47 as "Ttl GM %",
    kpi7 as "Comp Adj GM $",
    kpi8 as "NComp Adj GM $",
    kpi9 as "Ttl Adj GM $",
    kpi13 as "Comp Adj GM %",
    kpi14 as "NComp Adj GM %",
    kpi15 as "Ttl Adj GM %",
    kpi86 as "Comp GMROI",
    kpi85 as "NComp GMROI",
    kpi87 as "Ttl GMROI",
    kpi242 as "Comp Svc Lvl",
    kpi242 as "Ttl Svc Lvl",
    kpi244 as "Comp Qty Shp",
    kpi244 as "Ttl Qty Shp",
    kpi246 as "Comp Qty Ord",
    kpi246 as "Ttl Qty Ord",
    FIRST_VALUE(kpi98) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) AS "Comp BOH U",
    kpi97 as "NComp BOH U",
    kpi99 as "Ttl BOH U",
    kpi92 as "Comp BOH Cst",
    kpi91 as "NComp BOH Cst",
    kpi93 as "Ttl BOH Cst",
    kpi218 as "Comp BOH LCst",
    kpi219 as "Ttl BOH LCst",
    kpi107 as "Comp BOH AUC",
    kpi106 as "NComp BOH AUC",
    kpi108 as "Ttl BOH AUC",
    kpi220 as "Comp BOH AULC",
    kpi221 as "Ttl BOH AULC",
    kpi23 as "Comp EOH U",
    kpi22 as "NComp EOH U",
    kpi24 as "Ttl EOH U",
    kpi11 as "Comp EOH Cst",
    kpi10 as "NComp EOH Cst",
    kpi12 as "Ttl EOH Cst",
    kpi113 as "Comp EOH AUC",
    kpi112 as "NComp EOH AUC",
    kpi114 as "Ttl EOH AUC",
    kpi224 as "Comp EOH AULC",
    kpi225 as "Ttl EOH AULC",
    kpi35 as "Comp Avg Inv",
    kpi34 as "NComp Avg Inv",
    kpi36 as "Ttl Avg Inv",
    kpi38 as "Comp ST%",
    kpi37 as "NComp ST%",
    kpi39 as "Ttl ST%",
    kpi142 as "Comp WOS",
    kpi185 as "NComp WOS",
    kpi164 as "Ttl WOS",
    kpi165 as "Comp In Stock %",
    kpi168 as "NComp In Stock %",
    kpi143 as "Ttl In Stock %",
    kpi41 as "Comp Rct U",
    kpi171 as "NComp Rct U",
    kpi42 as "Ttl Rct U",
    kpi62 as "Comp Rct Cst",
    kpi170 as "NComp Rct Cst",
    kpi63 as "Ttl Rct Cst",
    kpi226 as "Comp Rct LCst",
    kpi227 as "Ttl Rct LCst",
    kpi56 as "Comp Rct AUC",
    kpi169 as "NComp Rct AUC",
    kpi57 as "Ttl Rct AUC",
    kpi228 as "Comp Rct AULC",
    kpi229 as "Ttl Rct AULC",
    kpi16 as "Comp CH Est Res U",
    kpi17 as "Ttl CH Est Res U",
    kpi18 as "Comp CH Est Res LCst",
    kpi19 as "Ttl CH Est Res LCst",
    kpi20 as "Comp CH Est Res AULC",
    kpi21 as "Ttl CH Est Res AULC",
    kpi25 as "Comp CH FULL U",
    kpi26 as "Ttl CH FULL U",
    kpi27 as "Comp CH FULL LCst",
    kpi28 as "Ttl CH FULL LCst",
    kpi29 as "Comp CH FULL AULC",
    kpi30 as "Ttl CH FULL AULC",
    kpi31 as "Comp Var Res FULL U",
    kpi32 as "Ttl Var Res FULL U",
    kpi33 as "Comp Var Res FULL LCst",
    kpi40 as "Ttl Var Res FULL LCst",
    kpi83 as "Comp Turn U",
    kpi82 as "NComp Turn U",
    kpi84 as "Ttl Turn U",
    kpi77 as "Comp Turn Cst",
    kpi76 as "NComp Turn Cst",
    kpi78 as "Ttl Turn Cst",
    kpi156 as "Comp OO U (Com)",
    kpi184 as "NComp OO U (Com)",
    kpi158 as "Ttl OO U (Com)",
    kpi157 as "Comp OO Cst (Com)",
    kpi182 as "NComp OO Cst (Com)",
    kpi160 as "Ttl OO Cst (Com)",
    kpi234 as "Comp OO LCst (Com)",
    kpi235 as "Ttl OO LCst (Com)",
    kpi173 as "Comp OO AUC (Com)",
    kpi175 as "NComp OO AUC (Com)",
    kpi177 as "Ttl OO AUC (Com)",
    kpi236 as "Comp OO AULC (Com)",
    kpi237 as "Ttl OO AULC (Com)",
    kpi163 as "Comp OO U (NCom)",
    kpi183 as "NComp OO U (NCom)",
    kpi159 as "Ttl OO U (NCom)",
    kpi161 as "Comp OO Cst (NCom)",
    kpi181 as "NComp OO Cst (NCom)",
    kpi162 as "Ttl OO Cst (NCom)",
    kpi238 as "Comp OO LCst (NCom)",
    kpi239 as "Ttl OO LCst (NCom)",
    kpi172 as "Comp OO AUC (NCom)",
    kpi174 as "NComp OO AUC (NCom)",
    kpi176 as "Ttl OO AUC (NCom)",
    kpi240 as "Comp OO AULC (NCom)",
    kpi241 as "Ttl OO AULC (NCom)",
    kpi148 as "Comp Inv Adj U",
    kpi149 as "NComp Inv Adj U",
    kpi150 as "Ttl Inv Adj U",
    kpi151 as "Comp Inv Adj Cst",
    kpi152 as "NComp Inv Adj Cst",
    kpi153 as "Ttl Inv Adj Cst",
    kpi230 as "Comp Inv Adj LCst",
    kpi231 as "Ttl Inv Adj LCst",
    kpi178 as "Comp Inv Adj AUC",
    kpi179 as "NComp Inv Adj AUC",
    kpi180 as "Ttl Inv Adj AUC",
    kpi232 as "Comp Inv Adj AULC",
    kpi233 as "Ttl Inv Adj AULC",
    kpi49 as "Comp EOH U OP",
    kpi50 as "Ttl EOH U OP",
    kpi51 as "Comp EOH U LF",
    kpi52 as "Ttl EOH U LF",
    kpi200 as "Comp EOH Cst OP",
    kpi201 as "NComp EOH Cst OP",
    kpi202 as "Ttl EOH Cst OP",
    kpi53 as "Comp EOH LCst OP",
    kpi54 as "Ttl EOH LCst OP",
    kpi203 as "Comp EOH Cst LF",
    kpi204 as "NComp EOH Cst LF",
    kpi205 as "Ttl EOH Cst LF",
    kpi55 as "Comp EOH LCst LF",
    kpi64 as "Ttl EOH LCst LF",
    kpi207 as "Comp OTB $ (WF vs OP)",
    kpi208 as "NComp OTB $ (WF vs OP)",
    kpi206 as "Ttl OTB $ (WF vs OP)",
    kpi209 as "Comp OTB $ (WF vs LF)",
    kpi210 as "NComp OTB $ (WF vs LF)",
    kpi211 as "Ttl OTB $ (WF vs LF)",
    kpi58 as "Comp OTB LCst WF to OP",
    kpi59 as "Ttl OTB LCst WF to OP",
    kpi60 as "Comp OTB LCst WF to LF",
    kpi61 as "Ttl OTB LCst WF to LF",
    kpi191 as "Comp Store Instock Facings",
    kpi190 as "NComp Store Instock Facings",
    kpi192 as "Ttl Store Instock Facings",
    kpi194 as "Comp Store Total Facings",
    kpi193 as "NComp Store Total Facings",
    kpi195 as "Ttl Store Total Facings",
    FIRST_VALUE(kpi65) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) AS  "Comp CH BOH U IMP",
    first_value(kpi65) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH BOH U IMP",
    first_value(kpi67) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH BOH LCst IMP",
    first_value(kpi67) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH BOH LCst IMP",
    first_value(kpi69) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH BOH Cst IMP",
    first_value(kpi69) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH BOH Cst IMP",
    first_value(kpi71) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH BOH U",
    first_value(kpi71) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH BOH U",
    first_value(kpi73) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH BOH Cst",
    first_value(kpi73) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH BOH Cst",
    kpi75 as "Comp CH BOH AULC",
    last_value(kpi109) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH EOH Cst",
    kpi79 as "Ttl CH BOH AULC",
    last_value(kpi80) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH EOH U IMP",
    last_value(kpi80) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH EOH U IMP",
    last_value(kpi88) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH EOH LCst IMP",
    last_value(kpi88) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH EOH LCst IMP",
    last_value(kpi90) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH EOH Cst IMP",
    last_value(kpi90) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH EOH Cst IMP",
    last_value(kpi95) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH EOH U",
    last_value(kpi95) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Ttl CH EOH U",
    last_value(kpi109) over (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line", fiscal_month_in_year ORDER BY current_week) as "Comp CH EOH Cst",
    kpi111 as "Comp CH EOH AULC",
    kpi115 as "Ttl CH EOH AULC",
    kpi116 as "Comp CH Est Res Rec %",
    kpi117 as "Ttl CH Est Res Rec %",
    kpi118 as "Comp CH Est Res Rec U",
    kpi119 as "Ttl CH Est Res Rec U",
    kpi120 as "Comp CH Est Res Rec Cst",
    kpi121 as "Ttl CH Est Res Rec Cst",
    kpi122 as "Comp Est 3rd Pty Rec %",
    kpi123 as "Ttl Est 3rd Pty Rec %",
    kpi136 as "Comp Est 3rd Pty Rec U",
    kpi137 as "Ttl Est 3rd Pty Rec U",
    kpi138 as "Comp Est 3rd Pty Rec Cst",
    kpi139 as "Ttl Est 3rd Pty Rec Cst",
    kpi140 as "Comp Est Bypass Rec %",
    kpi141 as "Ttl Est Bypass Rec %",
    kpi144 as "Comp Est Bypass Rec U",
    kpi145 as "Ttl Est Bypass Rec U",
    kpi146 as "Comp Est Bypass Rec Cst",
    kpi147 as "Ttl Est Bypass Rec Cst",
    kpi154 as "Comp CH Ttl Rct U",
    kpi155 as "Ttl CH Ttl Rct U",
    kpi166 as "Comp CH Ttl Rct Cst",
    kpi167 as "Ttl CH Ttl Rct Cst",
    kpi223 as "Ttl EOH LCst",
    kpi222 as "Comp EOH LCst"
    from
    ( -- abc
        select
            current_timestamp AT TIME ZONE ''America/New_York'' as "Timestamp",
            CASE
                WHEN channel = ''RP10'' THEN ''Retail''
                WHEN channel = ''HUSA'' THEN ''Retail''
                WHEN channel = ''1002'' THEN ''Retail''
                WHEN channel = ''CHESTER_DC'' THEN ''Chester DC''
                ELSE ''Wholesale''
            END AS "BU",
            CASE
                WHEN channel = ''ALBERTSONS COMPANIES INC.'' THEN ''FMD''
                WHEN channel = ''WAKEFERN FOOD CORP.'' THEN ''FMD''
                WHEN channel = ''MEIJER INC.'' THEN ''FMD''
                WHEN channel = ''CVS PHARMACY INC.'' THEN ''FMD''
                WHEN channel = ''WALMART CANADA INC'' THEN ''FMD''
                WHEN channel = ''WEGMANS FOOD MARKET INC.'' THEN ''FMD''
                WHEN channel = ''GIANT EAGLE INC.'' THEN ''FMD''
                WHEN channel = ''OTHER'' THEN ''FMD''
                ELSE channel
            END AS "Group",
            channel AS "Customer",
            l0_name as "Division",
            l1_name as "Department",
            l2_name as "Class",
            l3_name as "Line",
            fiscal_month_in_year,
            fiscal_year,
            current_week,
            op.hierarchy_code,
            kpi44,
            kpi43,
            kpi45,
            kpi125,
            kpi124,
            kpi126,
            kpi2,
            kpi1,
            kpi3,
            kpi213,
            kpi215,
            kpi104,
            kpi103,
            kpi105,
            kpi248,
            kpi249,
            kpi250,
            kpi216,
            kpi217,
            kpi101,
            kpi100,
            kpi102,
            kpi4,
            kpi5,
            kpi6,
            kpi212,
            kpi214,
            kpi131,
            kpi130,
            kpi132,
            kpi134,
            kpi133,
            kpi135,
            kpi128,
            kpi127,
            kpi129,
            kpi47,
            kpi46,
            kpi48,
            kpi7,
            kpi8,
            kpi9,
            kpi13,
            kpi14,
            kpi15,
            kpi86,
            kpi85,
            kpi87,
            kpi242,
            kpi243,
            kpi244,
            kpi245,
            kpi246,
            kpi247,
            kpi98,
            kpi97,
            kpi99,
            kpi92,
            kpi91,
            kpi93,
            kpi218,
            kpi219,
            kpi107,
            kpi106,
            kpi108,
            kpi220,
            kpi221,
            kpi23,
            kpi22,
            kpi24,
            kpi11,
            kpi10,
            kpi12,
            kpi113,
            kpi112,
            kpi114,
            kpi224,
            kpi225,
            kpi35,
            kpi34,
            kpi36,
            kpi38,
            kpi37,
            kpi39,
            kpi142,
            kpi185,
            kpi164,
            kpi165,
            kpi168,
            kpi143,
            kpi41,
            kpi171,
            kpi42,
            kpi62,
            kpi170,
            kpi63,
            kpi226,
            kpi227,
            kpi56,
            kpi169,
            kpi57,
            kpi228,
            kpi229,
            kpi16,
            kpi17,
            kpi18,
            kpi19,
            kpi20,
            kpi21,
            kpi25,
            kpi26,
            kpi27,
            kpi28,
            kpi29,
            kpi30,
            kpi31,
            kpi32,
            kpi33,
            kpi40,
            kpi83,
            kpi82,
            kpi84,
            kpi77,
            kpi76,
            kpi78,
            kpi156,
            kpi184,
            kpi158,
            kpi157,
            kpi182,
            kpi160,
            kpi234,
            kpi235,
            kpi173,
            kpi175,
            kpi177,
            kpi236,
            kpi237,
            kpi163,
            kpi183,
            kpi159,
            kpi161,
            kpi181,
            kpi162,
            kpi238,
            kpi239,
            kpi172,
            kpi174,
            kpi176,
            kpi240,
            kpi241,
            kpi148,
            kpi149,
            kpi150,
            kpi151,
            kpi152,
            kpi153,
            kpi230,
            kpi231,
            kpi178,
            kpi179,
            kpi180,
            kpi232,
            kpi233,
            kpi49,
            kpi50,
            kpi51,
            kpi52,
            kpi200,
            kpi201,
            kpi202,
            kpi53,
            kpi54,
            kpi203,
            kpi204,
            kpi205,
            kpi55,
            kpi64,
            kpi207,
            kpi208,
            kpi206,
            kpi209,
            kpi210,
            kpi211,
            kpi58,
            kpi59,
            kpi60,
            kpi61,
            kpi191,
            kpi190,
            kpi192,
            kpi194,
            kpi193,
            kpi195,
            kpi65,
            kpi66,
            kpi67,
            kpi68,
            kpi69,
            kpi70,
            kpi71,
            kpi72,
            kpi73,
            kpi74,
            kpi75,
            kpi110,
            kpi79,
            kpi80,
            kpi81,
            kpi88,
            kpi89,
            kpi90,
            kpi94,
            kpi95,
            kpi96,
            kpi109,
            kpi111,
            kpi115,
            kpi116,
            kpi117,
            kpi118,
            kpi119,
            kpi120,
            kpi121,
            kpi122,
            kpi123,
            kpi136,
            kpi137,
            kpi138,
            kpi139,
            kpi140,
            kpi141,
            kpi144,
            kpi145,
            kpi146,
            kpi147,
            kpi154,
            kpi155,
            kpi166,
            kpi167,
            kpi223,
            kpi222
        FROM
            (select 
    * 
  from 
(select 
      *
    from plan_smart.'||src_tbl_name||'_'||regexp_replace(channel, '[ /.-]', '', 'g')||' 
    where channel = ''' ||channel||'''
    and current_week >= ' || v_start_week || '

) a
INNER join public.lines_wholesale
using (hierarchy_code)) as op
            INNER JOIN (
                SELECT
                    fiscal_year,
                    fiscal_month_in_year,
                    fdm.fiscal_year_week
                FROM
                    "global".fiscal_date_mapping fdm
                GROUP by
                    fiscal_year,
                    fiscal_month_in_year,
                    fdm.fiscal_year_week
            ) s ON op.current_week = s.fiscal_year_week
    ) abc 
    ) bcd 
    group by
    "Timestamp",
    "BU",
    "Group",
    "Customer",
    "Division",
    "Department",
    "Class",
    "Line",
    fiscal_month_in_year,
    fiscal_year';
   
   raise notice 'sql = %',v_sql;
     
   execute v_sql;
  
   GET DIAGNOSTICS v_affected_rows = ROW_COUNT ;
   raise notice 'Rows inserted into % for % = %',tgt_tbl_name,channel,v_affected_rows;
   end if;
 
end loop;
end;
$procedure$
;


