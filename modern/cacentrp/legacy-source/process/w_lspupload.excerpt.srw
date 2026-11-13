/* Excerpt from w_lspupload.srw — Load LSP records */
/* Full source ~70KB; keeps file paths, layout, INTINPFL insert. */

forward
global type w_lspupload from window
end type
type dw_lspuploadbrstrans from datawindow within w_lspupload
end type
type dw_cheques from datawindow within w_lspupload
end type
type dw_lspuploadgrptrans from datawindow within w_lspupload
end type
type dw_lspuploadbpytrans from datawindow within w_lspupload
end type
type dw_lspuploaddisitemcurrx from datawindow within w_lspupload
end type
type dw_lspuploadoritemcurrx from datawindow within w_lspupload
end type
type cb_2 from commandbutton within w_lspupload
end type
type cb_1 from commandbutton within w_lspupload
end type
type p_1 from picture within w_lspupload
end type
type st_read from statictext within w_lspupload
end type
type st_2 from statictext within w_lspupload
end type
type st_1 from statictext within w_lspupload
end type
type st_process from statictext within w_lspupload
end type
type st_percent from statictext within w_lspupload
end type
type hpb_1 from hprogressbar within w_lspupload
end type
type gb_1 from groupbox within w_lspupload
end type
type dw_lspuploadaptransx from datawindow within w_lspupload
end type
type dw_jro from datawindow within w_lspupload
end type
type timing_1 from timing within w_lspupload
end type
end forward

shared variables
INTEGER si_sw, si_second, si_minute , si_hour 
end variables

global type w_lspupload from window
integer width = 1938
integer height = 692
boolean titlebar = true
string title = "Create LSP upload file"
boolean controlmenu = true
windowtype windowtype = child!
long backcolor = 67108864
string icon = "DosEdit5!"
event type boolean ue_createacctent ( )
event type boolean ue_lspupload ( )
dw_lspuploadbrstrans dw_lspuploadbrstrans
dw_cheques dw_cheques
dw_lspuploadgrptrans dw_lspuploadgrptrans
dw_lspuploadbpytrans dw_lspuploadbpytrans
dw_lspuploaddisitemcurrx dw_lspuploaddisitemcurrx
dw_lspuploadoritemcurrx dw_lspuploadoritemcurrx
cb_2 cb_2
cb_1 cb_1
p_1 p_1
st_read st_read
st_2 st_2
st_1 st_1

/* --- snippets --- */
/* ... around line 116 ... */
ls_procdte  = STRING(TODAY(), 'mm/dd/yyyy')
ls_fileapln = 'c:\cacent~~1\lspapln\UN_'+STRING(TODAY(),'mm')+STRING(TODAY(),'dd')+'.lsp'
ls_filealai = 'c:\cacent~~1\lspalai\UN_'+STRING(TODAY(),'mm')+STRING(TODAY(),'dd')+'.lsp'
si_sw  = 1 
ldt_processdate = TODAY()

SELECT count(*)  
  INTO :ll_brsfailed  
  FROM ALAICAC.BDOAPMST  
  WHERE ( ALAICAC.BDOAPMST.BDOASTATUS <> 'L' ) AND
        ( ALAICAC.BDOAPMST.BDOACODE = 'BRS' ) ;

/* ... around line 1050 ... */
ls_fileapln = 'c:\cacent~~1\lspapln\UN_'+STRING(TODAY(),'mm')+STRING(TODAY(),'dd')+'.lsp'
ls_filealai = 'c:\cacent~~1\lspalai\UN_'+STRING(TODAY(),'mm')+STRING(TODAY(),'dd')+'.lsp'
si_sw  = 1 
DECLARE c_nlsp1 CURSOR FOR
  SELECT "SYRNLSPUPLD"."ACCTCODE"  
    FROM "SYRNLSPUPLD"  
   WHERE "SYRNLSPUPLD"."COMPCODE" = :ls_compcode ;

// Count how many NLSP records will be loaded for APLN & ALAI

ls_recdest = 'nlsp'

/* ... around line 112 ... */

ls_recdest  = 'lsp'
ls_compcode = 'APLN'
ls_userid   = TRIM(SQLCA.userid)
ls_procdte  = STRING(TODAY(), 'mm/dd/yyyy')
ls_fileapln = 'c:\cacent~~1\lspapln\UN_'+STRING(TODAY(),'mm')+STRING(TODAY(),'dd')+'.lsp'
ls_filealai = 'c:\cacent~~1\lspalai\UN_'+STRING(TODAY(),'mm')+STRING(TODAY(),'dd')+'.lsp'
si_sw  = 1 
ldt_processdate = TODAY()

SELECT count(*)  

/* ... around line 275 ... */
			integer li_FileNumapln
         li_FileNumapln = FileOpen(ls_fileapln, LineMode!, Write!, LockWrite!, Replace!)
		CASE 2
			ls_compcode = 'ALAI'
			IF ll_countalai <= 0 THEN
				CONTINUE
			END IF 
			integer li_FileNumalai
         li_FileNumalai = FileOpen(ls_filealai, LineMode!, Write!, LockWrite!, Replace!)
	END CHOOSE
	

/* ... around line 783 ... */
			ls_lspcurrent = ''
	   	ls_lspcurrent = STRING(lstr_lspcurrent.compcode, "@@@@")
		   ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.icdrcd, "@@@")
			
			// NB Business Application No.
			
//			IF TRIM( lstr_lspcurrent.iactcd ) = '375008' OR ( lstr_lspcurrent.iacttype = 'C' AND &
//			   lstr_lspcurrent.inortype = '2' AND  TRIM( lstr_lspcurrent.iactcd )  = '100007' ) OR &
//				( lstr_lspcurrent.iacttype = 'R' AND &
//			   lstr_lspcurrent.inortype = '1' AND  TRIM( lstr_lspcurrent.iactcd )  = '375040' ) THEN
//				lstr_lspcurrent.ipolno = 'A' + LEFT( TRIM( lstr_lspcurrent.ipolno ), 9 )

/* ... around line 818 ... */
			IF li_ctr = 1 THEN
				FILEWRITE(li_FileNumapln,ls_lspcurrent)
			ELSEIF li_ctr = 2 THEN
				FILEWRITE(li_fileNumalai,ls_lspcurrent)
			END IF
		
			ls_icomp    = STRING(lstr_lspcurrent.compcode, "@@@@")
			ls_icdrcd   = STRING(lstr_lspcurrent.icdrcd, "@@@")
			
			ls_ipolno   = f_padleftspace( TRIM( lstr_lspcurrent.ipolno ), 10 ) 
			ls_ipolno   = STRING( ls_ipolno, "@@@@@@@@@@" )

/* ... around line 871 ... */
			IF ll_iactcd <> 450001 THEN
				INSERT INTO "INTINPFL"  
							 ( "ICOMP","ICDRCD","IPOLNO","INPLN","INPFN","INPMI","INPACT",   
								"INPOPT","IACTCD","INPSGN","INPAMT","IORNUM","IORDTC",   
								"IORDTY","IORDTM","IORDTD","INPSRC","INPENT","INPSTP",   
								"IAGTCD","INCVNO","INCKNO","INPRDT","ICLRDT")  //"INAMT1"
					 VALUES   (:ls_icomp,:ls_icdrcd,:ls_ipolno,:ls_inpln,:ls_inpfn,:ls_inpmi,:ls_inpact,
							  :ls_inpopt,:ll_iactcd,:ls_inpsgn,:ldec_inpamt,:ls_iornum,:li_iordtc,
							  :li_iordty,:li_iordtm,:li_iordtd,:ls_inpsrc,:ls_inpent,:ls_inpstp,
							  :ls_iagtcd,:ls_incvno,:ls_inckno, :ls_inprdt,:ls_iclrdt) USING SQLCA_ALMODDATA ;  //:ll_grosscomm
				IF SQLCA_ALMODDATA.SQLCODE <> 0 THEN

/* ... around line 86 ... */
forward prototypes
public function boolean wf_loadnlsp ()
public function date wf_clearing (date dstart, character clrtype)
end prototypes

event ue_lspupload;STRING  ls_icomp,ls_compcode, ls_recdest, ls_userid, ls_procdte, ls_doctype, ls_docnum, ls_lspcurrent, ls_filealai,ls_fileapln, ls_tempamount, ls_decimaltrim,ls_wholetrim
STRING  ls_icdrcd,ls_ipolno,ls_inpln,ls_inpfn,ls_inpmi,ls_inpact,ls_inpopt,ls_inpsgn,ls_iornum
STRING  ls_inpsrc,ls_inpent,ls_inpstp,ls_iagtcd,ls_incvno,ls_inckno,ls_inprdt,ls_iclrdt
LONG    ll_countalai, ll_countapln, ll_count , ll_processctr, ll_rowcurrentlspaptransx,ll_rowcountlspaptransx, ll_rowcurrentlsporitemcurrx,ll_rowcountlsporitemcurrx,ll_rowcurrentlspdisitemcurrx,ll_rowcountlspdisitemcurrx, ll_insertrow
INTEGER li_ctr, li_percent,li_iordtc,li_iordty,li_iordtm,li_iordtd, li_recdest, ll_chequesrowcount,ll_chequesrowccurrent
LONG ll_iactcd

/* ... around line 163 ... */
DECLARE c_nlsp CURSOR FOR
  SELECT "SYRNLSPUPLD"."ACCTCODE"  
    FROM "SYRNLSPUPLD"  
   WHERE "SYRNLSPUPLD"."COMPCODE" = :ls_compcode ;

// Count how many NLSP records will be loaded for APLN & ALAI

ls_recdest = 'nlsp'
FOR li_ctr = 1 TO 2
	IF li_ctr = 1 THEN
		ls_compcode = 'ALAI'
