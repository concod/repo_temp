--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:generate_retail_chester_reports_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38204
--comment: initial changeset for generate_retail_chester_reports
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS plan_smart.generate_retail_chester_reports(IN plan_version text);
CREATE OR REPLACE PROCEDURE plan_smart.generate_retail_chester_reports(IN plan_version text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
 v_sql               text;
 channel             text;
 v_affected_rows     int4;
 tgt_tbl_name        text;
 src_tbl_name        text;
 v_start_week       int4;
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

 v_sql := 'drop table if exists paf_l3_retail';
 raise notice 'step0:%',v_sql;
  execute v_sql;
  v_sql := 'create table paf_l3_retail as
select l0_name,l1_name,l2_name,l3_name
from "global".product_attributes_filter paf
where business_unit = ''Retail''
group by l0_name,l1_name,l2_name,l3_name';

raise notice 'step1:%',v_sql;
 execute v_sql;

 v_sql := 'drop table if exists lines_retail';
raise notice 'step2:%',v_sql;
 execute v_sql;

 v_sql := 'create table lines_retail as
(select * from
(select hierarchy_code,l0_name,l1_name,l2_name,l3_name
from plan_smart.product_hierarchies_filter where level = 4) phf
inner join paf_l3_retail
using (l0_name,l1_name,l2_name,l3_name)
)';
raise notice 'step3:%',v_sql;
execute v_sql;

  v_sql := 'create index idx_lines_retail on lines_retail(hierarchy_code)'; 
  execute v_sql;

  v_sql := 'analyze lines_retail';
 
  execute v_sql;
  select
    case 
	 when plan_version = 'WP' then 'plan_smart.wp_retail_chester_report'
     when plan_version = 'WF' then 'plan_smart.wf_retail_chester_report'
     when plan_version = 'OP' then 'plan_smart.op_retail_chester_report'
     when plan_version = 'LF' then 'plan_smart.lf_retail_chester_report'
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

v_sql := '	
insert into '||tgt_tbl_name||'
with gg as (select
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
    current_week,
kpi44 as "Comp Sls U",
kpi43 as "NComp Sls U",
kpi44 + kpi43 as "Ttl Sls U",
kpi125 as "Comp Sls $",
kpi124 as "NComp Sls $",
kpi125+kpi124 as "Ttl Sls $",
kpi2 as "Comp AUR",
kpi1 as "NComp AUR",
kpi3 as "Ttl AUR",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi213
        ELSE 0
    END AS "Comp AUP",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi213
        ELSE 0
    END AS "Ttl AUP",
kpi104 as "Comp COGS",
kpi103 as "NComp COGS",
kpi104+kpi103 as "Ttl COGS",
kpi248 as "Comp Adj Cst",
kpi249 as "NComp Adj Cst",
kpi248+kpi249 as "Ttl Adj Cst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi216
        ELSE 0
    END AS "Comp COGS.",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi216
        ELSE 0
    END AS "Ttl COGS.",
kpi101 as "Comp AUC",
kpi100 as "NComp AUC",
kpi102 as "Ttl AUC",
kpi4 as "Comp Adj AUC",  
kpi5 as "NComp Adj AUC",
kpi6 as "Ttl Adj AUC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi212
        ELSE 0
    END AS "Comp AULC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi212
        ELSE 0
    END AS "Ttl AULC",
 CASE
    WHEN lag(kpi44) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) IS NULL THEN 0
    WHEN lag(kpi44) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) = 0 THEN 0
    ELSE kpi44 / lag(kpi44) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) end as "Comp Sls U Build",
 CASE
    WHEN lag(kpi43) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) IS NULL THEN 0
    WHEN lag(kpi43) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) = 0 THEN 0
    ELSE kpi43 / lag(kpi43) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) end as "NComp Sls U Build",
 CASE
    WHEN lag(kpi44 + kpi43) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) IS NULL THEN 0
    WHEN lag(kpi44 + kpi43) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) = 0 THEN 0
    ELSE (kpi44 + kpi43) / lag((kpi44 + kpi43)) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) end as "Ttl Sls U Build",
CASE
    WHEN lag(kpi125) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) IS NULL THEN 0
    WHEN lag(kpi125) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) = 0 THEN 0
    ELSE kpi125 / lag(kpi125) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) end as "Comp Sls $ Build",
 CASE
    WHEN lag(kpi124) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) IS NULL THEN 0
    WHEN lag(kpi124) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) = 0 THEN 0
    ELSE kpi124 / lag(kpi124) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) end as "NComp Sls $ Build",
 CASE
    WHEN lag(kpi125+kpi124) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) IS NULL THEN 0
    WHEN lag(kpi125+kpi124) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) = 0 THEN 0
    ELSE (kpi125+kpi124) / lag((kpi125+kpi124)) OVER (PARTITION BY "BU","Group","Customer","Division","Department","Class","Line" ORDER BY current_week) end as "Ttl Sls $ Build",
kpi128 as "Comp GM $",
kpi127 as "NComp GM $",
kpi128+kpi127 as "Ttl GM $",
kpi47 as "Comp GM %",
kpi46 as "NComp GM %",
kpi48 as "Ttl GM %",
kpi7 as "Comp Adj GM $",
kpi8 as "NComp Adj GM $",
kpi7+kpi8 as "Ttl Adj GM $",
kpi13 as "Comp Adj GM %",
kpi14 as "NComp Adj GM %",
kpi15 as "Ttl Adj GM %",
coalesce (2*kpi128/nullif((kpi92+kpi11),0),0) as "Comp GMROI",
coalesce (2*kpi127/nullif((kpi91+kpi10),0),0) as "NComp GMROI",
coalesce (2*(kpi128+kpi127)/nullif((kpi92+kpi11+kpi91+kpi10),0),0) as "Ttl GMROI",
kpi242 as "Comp Svc Lvl",
kpi242 as "Ttl Svc Lvl",
kpi244 as "Comp Qty Shp",
kpi244 as "Ttl Qty Shp",
kpi246 as "Comp Qty Ord",
kpi246 as "Ttl Qty Ord",
kpi98 as "Comp BOH U",
kpi97 as "NComp BOH U",
kpi98+kpi97 as "Ttl BOH U",
kpi92 as "Comp BOH Cst",
kpi91 as "NComp BOH Cst",
kpi92+kpi91 as "Ttl BOH Cst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi218
        ELSE 0
    END AS "Comp BOH LCst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi218
        ELSE 0
    END AS "Ttl BOH LCst",
kpi107 as "Comp BOH AUC",
kpi106 as "NComp BOH AUC",
kpi108 as "Ttl BOH AUC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi220
        ELSE 0
    END AS "Comp BOH AULC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi220
        ELSE 0
    END AS "Ttl BOH AULC",
kpi23 as "Comp EOH U",
kpi22 as "NComp EOH U",
kpi23+kpi22 as "Ttl EOH U",
kpi11 as "Comp EOH Cst",
kpi10 as "NComp EOH Cst",
kpi11+kpi10 as "Ttl EOH Cst",
kpi113 as "Comp EOH AUC",
kpi112 as "NComp EOH AUC",
kpi114 as "Ttl EOH AUC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi224
        ELSE 0
    END AS "Comp EOH AULC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi224
        ELSE 0
    END AS "Ttl EOH AULC",
kpi35 as "Comp Avg Inv",
kpi34 as "NComp Avg Inv",
kpi35+kpi34 as "Ttl Avg Inv",
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
kpi41+kpi171 as "Ttl Rct U",
kpi62 as "Comp Rct Cst",
kpi170 as "NComp Rct Cst",
kpi62+kpi170 as "Ttl Rct Cst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi226
        ELSE 0
    END AS "Comp Rct LCst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi226
        ELSE 0
    END AS "Ttl Rct LCst",
kpi56 as "Comp Rct AUC",
kpi169 as "NComp Rct AUC",
kpi57 as "Ttl Rct AUC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi228
        ELSE 0
    END AS "Comp Rct AULC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi228
        ELSE 0
    END AS "Ttl Rct AULC",
kpi16 as "Comp CH Est Res U",
kpi16 as "Ttl CH Est Res U",
kpi18 as "Comp CH Est Res LCst",
kpi18 as "Ttl CH Est Res LCst",
kpi20 as "Comp CH Est Res AULC",
kpi21 as "Ttl CH Est Res AULC",
kpi25 as "Comp CH FULL U",
kpi25 as "Ttl CH FULL U",
kpi27 as "Comp CH FULL LCst",
kpi27 as "Ttl CH FULL LCst",
kpi29 as "Comp CH FULL AULC",
kpi30 as "Ttl CH FULL AULC",
kpi31 as "Comp Var Res FULL U",
kpi31 as "Ttl Var Res FULL U",
kpi33 as "Comp Var Res FULL LCst",
kpi33 as "Ttl Var Res FULL LCst",
kpi83 as "Comp Turn U",
kpi82 as "NComp Turn U",
kpi84 as "Ttl Turn U",
kpi77 as "Comp Turn Cst",
kpi76 as "NComp Turn Cst",
kpi78 as "Ttl Turn Cst",
kpi156 as "Comp OO U (Com)",
kpi184 as "NComp OO U (Com)",
kpi156+kpi184 as "Ttl OO U (Com)",
kpi157 as "Comp OO Cst (Com)",
kpi182 as "NComp OO Cst (Com)",
kpi157+kpi182 as "Ttl OO Cst (Com)",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi234
        ELSE 0
    END AS "Comp OO LCst (Com)",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi234
        ELSE 0
    END AS "Ttl OO LCst (Com)",
kpi173 as "Comp OO AUC (Com)",
kpi175 as "NComp OO AUC (Com)",
kpi177 as "Ttl OO AUC (Com)",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi236
        ELSE 0
    END AS "Comp OO AULC (Com)",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi236
        ELSE 0
    END AS "Ttl OO AULC (Com)",
kpi163 as "Comp OO U (NCom)",
kpi183 as "NComp OO U (NCom)",
kpi163+kpi183 as "Ttl OO U (NCom)",
kpi161 as "Comp OO Cst (NCom)",
kpi181 as "NComp OO Cst (NCom)",
kpi161+kpi181 as "Ttl OO Cst (NCom)",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi238
        ELSE 0
    END AS "Comp OO LCst (NCom)",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi238
        ELSE 0
    END AS "Ttl OO LCst (NCom)",
kpi172 as "Comp OO AUC (NCom)",
kpi174 as "NComp OO AUC (NCom)",
kpi176 as "Ttl OO AUC (NCom)",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi240
        ELSE 0
    END AS "Comp OO AULC (NCom)",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi240
        ELSE 0
    END AS "Ttl OO AULC (NCom)",
kpi148 as "Comp Inv Adj U",
kpi149 as "NComp Inv Adj U",
kpi148+kpi149 as "Ttl Inv Adj U",
kpi151 as "Comp Inv Adj Cst",
kpi152 as "NComp Inv Adj Cst",
kpi151+kpi152 as "Ttl Inv Adj Cst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi230
        ELSE 0
    END AS "Comp Inv Adj LCst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi230
        ELSE 0
    END AS "Ttl Inv Adj LCst",
kpi178 as "Comp Inv Adj AUC",
kpi179 as "NComp Inv Adj AUC",
kpi180 as "Ttl Inv Adj AUC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi232
        ELSE 0
    END AS "Comp Inv Adj AULC",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi232
        ELSE 0
    END AS "Ttl Inv Adj AULC",
kpi49 as "Comp EOH U OP",
kpi50 as "Ttl EOH U OP",
kpi51 as "Comp EOH U LF",
kpi52 as "Ttl EOH U LF",
kpi200 as "Comp EOH Cst OP",
kpi201 as "NComp EOH Cst OP",
kpi200+kpi201 as "Ttl EOH Cst OP",
kpi53 as "Comp EOH LCst OP",
kpi53 as "Ttl EOH LCst OP",
kpi203 as "Comp EOH Cst LF",
kpi204 as "NComp EOH Cst LF",
kpi203+kpi204 as "Ttl EOH Cst LF",
kpi55 as "Comp EOH LCst LF",
kpi55 as "Ttl EOH LCst LF",
kpi207 as "Comp OTB $ (WF vs OP)",
kpi208 as "NComp OTB $ (WF vs OP)",
kpi207+kpi208 as "Ttl OTB $ (WF vs OP)",
kpi209 as "Comp OTB $ (WF vs LF)",
kpi210 as "NComp OTB $ (WF vs LF)",
kpi209+kpi210 as "Ttl OTB $ (WF vs LF)",
kpi58 as "Comp OTB LCst WF to OP",
kpi58 as "Ttl OTB LCst WF to OP",
kpi60 as "Comp OTB LCst WF to LF",
kpi60 as "Ttl OTB LCst WF to LF",
kpi191 as "Comp Store Instock Facings",
kpi190 as "NComp Store Instock Facings",
kpi192 as "Ttl Store Instock Facings",
kpi194 as "Comp Store Total Facings",
kpi193 as "NComp Store Total Facings",
kpi195 as "Ttl Store Total Facings",
kpi65 as "Comp CH BOH U IMP",
kpi65 as "Ttl CH BOH U IMP",
kpi67 as "Comp CH BOH LCst IMP",
kpi67 as "Ttl CH BOH LCst IMP",
kpi69 as "Comp CH BOH Cst IMP",
kpi69 as "Ttl CH BOH Cst IMP",
kpi71 as "Comp CH BOH U",
kpi71 as "Ttl CH BOH U",
kpi73 as "Comp CH BOH Cst",
kpi73 as "Ttl CH BOH Cst",
kpi75 as "Comp CH BOH AULC",
kpi109 as "Ttl CH EOH Cst",
kpi79 as "Ttl CH BOH AULC",
kpi80 as "Comp CH EOH U IMP",
kpi80 as "Ttl CH EOH U IMP",
kpi88 as "Comp CH EOH LCst IMP",
kpi88 as "Ttl CH EOH LCst IMP",
kpi90 as "Comp CH EOH Cst IMP",
kpi90 as "Ttl CH EOH Cst IMP",
kpi95 as "Comp CH EOH U",
kpi95 as "Ttl CH EOH U",
kpi109 as "Comp CH EOH Cst",
kpi111 as "Comp CH EOH AULC",
kpi115 as "Ttl CH EOH AULC",
kpi116 as "Comp CH Est Res Rec %",
kpi116 as "Ttl CH Est Res Rec %",
kpi118 as "Comp CH Est Res Rec U",
kpi118 as "Ttl CH Est Res Rec U",
kpi120 as "Comp CH Est Res Rec Cst",
kpi120 as "Ttl CH Est Res Rec Cst",
kpi122 as "Comp Est 3rd Pty Rec %",
kpi122 as "Ttl Est 3rd Pty Rec %",
kpi136 as "Comp Est 3rd Pty Rec U",
kpi136 as "Ttl Est 3rd Pty Rec U",
kpi138 as "Comp Est 3rd Pty Rec Cst",
kpi138 as "Ttl Est 3rd Pty Rec Cst",
kpi140 as "Comp Est Bypass Rec %",
kpi140 as "Ttl Est Bypass Rec %",
kpi144 as "Comp Est Bypass Rec U",
kpi144 as "Ttl Est Bypass Rec U",
kpi146 as "Comp Est Bypass Rec Cst",
kpi146 as "Ttl Est Bypass Rec Cst",
kpi154 as "Comp CH Ttl Rct U",
kpi154 as "Ttl CH Ttl Rct U",
kpi166 as "Comp CH Ttl Rct Cst",
kpi166 as "Ttl CH Ttl Rct Cst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi222
        ELSE 0
    END AS "Comp EOH LCst",
CASE
        WHEN "BU" = ''Chester DC'' THEN kpi222
        ELSE 0
    END AS "Ttl EOH LCst"
from
(select
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
            current_week,
            hierarchy_code,
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
            (select * from 
(select b. l0_name,b. l1_name, b. l2_name, b. l3_name, a. *, c.business_unit
  from 
(select 
      *
    from plan_smart.'||src_tbl_name||'  
    where channel in (''RP10'',''1002'',''HUSA'',''CHESTER_DC'')
    and current_week >= ' || v_start_week || '

) a
inner join (select * from plan_smart.product_hierarchies_filter where level = 4) as b
using (hierarchy_code)
left join (select *,''Retail'' as business_unit from public.lines_retail) as c
using (hierarchy_code)) as d
where channel = ''CHESTER_DC'' or (channel in (''RP10'',''1002'',''HUSA'') and business_unit is not null))a) abc)       
select *	
from gg ';
   
   --raise notice 'sql = %',v_sql;
     
   execute v_sql;
  
   GET DIAGNOSTICS v_affected_rows = ROW_COUNT ;
   raise notice 'Rows inserted for % = %',channel,v_affected_rows;

end;
$procedure$
;
