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
st_process st_process
st_percent st_percent
hpb_1 hpb_1
gb_1 gb_1
dw_lspuploadaptransx dw_lspuploadaptransx
dw_jro dw_jro
timing_1 timing_1
end type
global w_lspupload w_lspupload

type variables

end variables

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
DATE    ldte_vdate,ldte_inprdate,ldte_inpclrdt, ldt_ssidate
TIME    lt_start , lt_now 
DECIMAL ldec_inpamt
LONG ll_nlsp_acctcode_ctr, ll_nlsp_alai, ll_nlsp_apln, ll_nlsp_total, ll_grosscomm
STRING  ls_nlsp_acctcode, ls_orno, ls_polno, ls_entno, ls_clrtype, ls_chktype, ls_fn 
DATE    ldt_partialload, ldt_clearing, ldt_processdate
LONG    ll_currentbpy, ll_totalbpy, ll_currentgrp, ll_totalgrp, ll_lnpos, ll_mipos
LONG    ll_totalbrs, ll_currentbrs, ll_brsfailed
INTEGER li_sqlcode, li_chkclrno
integer li_bankdays, li_partialloaddays
DATE ldt_cleardate


STR_CURRLEDGE lstr_currledge, lstr_currledgenull
STR_LSPCURRENT lstr_lspcurrent, lstr_lspcurrentnull

ls_recdest  = 'lsp'
ls_compcode = 'APLN'
ls_userid   = TRIM(SQLCA.userid)
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
		  
IF ll_brsfailed > 0 THEN
	MessageBox('Critical Error', 'BRS File Processing incomplete!~n~rContact System Admin', StopSign!, Ok!)
	RETURN FALSE
END IF

IF MessageBox( "Please Confirm!", "INTINPFL will be cleared!~n~rDo you want to proceed?", Question!, YesNo! ) = 1 THEN
	DELETE FROM "INTINPFL" USING SQLCA_ALMODDATA;
ELSE
	CLOSE( w_lspupload )
	RETURN TRUE	
END IF

SELECT COUNT(*) INTO :ll_countapln FROM CURRLEDGE 
WHERE  CURRLEDGE.RECDEST = :ls_recdest AND
       CURRLEDGE.COCODE  = :ls_compcode AND 
		 CURRLEDGE.AMOUNT  > 0 ;
		 
IF ISNULL(ll_countapln) THEN
	ll_countapln = 0
END IF

ls_recdest  = 'lsp'
ls_compcode = 'ALAI'

SELECT COUNT(*) INTO :ll_countalai FROM CURRLEDGE 
WHERE  CURRLEDGE.RECDEST = :ls_recdest AND
       CURRLEDGE.COCODE  = :ls_compcode AND 
		 CURRLEDGE.AMOUNT  > 0 ;
		 
IF ISNULL(ll_countalai) THEN
	ll_countapln = 0
END IF

ll_count = ll_countalai + ll_countapln

DECLARE c_nlsp CURSOR FOR
  SELECT "SYRNLSPUPLD"."ACCTCODE"  
    FROM "SYRNLSPUPLD"  
   WHERE "SYRNLSPUPLD"."COMPCODE" = :ls_compcode ;

// Count how many NLSP records will be loaded for APLN & ALAI

ls_recdest = 'nlsp'
FOR li_ctr = 1 TO 2
	IF li_ctr = 1 THEN
		ls_compcode = 'ALAI'
	ELSE
		ls_compcode = 'APLN'
	END IF

	OPEN c_nlsp ;

	DO WHILE sqlca.sqlcode = 0 
		YIELD()

		FETCH c_nlsp INTO :lstr_currledge.acctcode ;

		IF sqlca.sqlcode = 100 THEN
			EXIT
		END IF
	
		SELECT COUNT( * ) INTO :ll_nlsp_acctcode_ctr FROM "CURRLEDGE"
			WHERE "CURRLEDGE"."ACCTCODE" = :lstr_currledge.acctcode AND
					"CURRLEDGE"."COCODE" = :ls_compcode AND 
					"CURRLEDGE"."RECDEST" = :ls_recdest AND 
					"CURRLEDGE"."AMOUNT" > 0 ;
				
		IF ISNULL(ll_nlsp_acctcode_ctr) THEN
			ll_nlsp_acctcode_ctr = 0
		END IF
		
		IF ls_compcode = 'ALAI' THEN
			ll_nlsp_alai += ll_nlsp_acctcode_ctr
		ELSE
			ll_nlsp_apln += ll_nlsp_acctcode_ctr
		END IF
	LOOP
	CLOSE c_nlsp ;
NEXT

ll_nlsp_total = ll_nlsp_apln + ll_nlsp_alai

IF ll_count <= 0 AND ll_nlsp_total <= 0 THEN
	MessageBox('Stop', 'No record(s) to process .....', StopSign!, Ok!)
	RETURN FALSE
END IF

ls_recdest = 'lsp' 

DECLARE c_currledge CURSOR FOR  
SELECT CURRLEDGE.COCODE,   
       CURRLEDGE.FOCODE,   
       CURRLEDGE.REFNO,   
       CURRLEDGE.REFDATE,   
       CURRLEDGE.SOURCETYPE,   
       CURRLEDGE.ACCTCODE,   
       CURRLEDGE.DRCR,   
       CURRLEDGE.AMOUNT,   
       CURRLEDGE.UNIT,   
       CURRLEDGE.ORIGCY,   
       CURRLEDGE.LOCCY,   
       CURRLEDGE.LOB,   
       CURRLEDGE.PROCESSDATE,   
       CURRLEDGE.ITEMNO,   
       CURRLEDGE.RECDEST,   
       CURRLEDGE.CONTROLNO,   
       CURRLEDGE.LSPACCTYPE,   
       CURRLEDGE.LSPORTYPE,   
       CURRLEDGE.PAYTYPE, 
		 CURRLEDGE.NUMBERSIGN
FROM  CURRLEDGE 
WHERE CURRLEDGE.COCODE  = :ls_compcode AND
      CURRLEDGE.RECDEST = :ls_recdest AND
		CURRLEDGE.AMOUNT > 0
ORDER BY CURRLEDGE.COCODE,   
         CURRLEDGE.RECDEST, 
			CURRLEDGE.SOURCETYPE, 
	      CURRLEDGE.FOCODE,   
       	CURRLEDGE.REFNO,   
			CURRLEDGE.ACCTCODE DESC ;

ll_processctr   =  0
st_process.text = '0'
st_percent.text = '0' + "%" + " Complete"
st_read.text    = STRING(ll_count)

SELECT "ALAICAC"."SYRCACPARAM"."PARAMAMT"  
   INTO :li_partialloaddays  
   FROM "ALAICAC"."SYRCACPARAM"  
	WHERE ( "ALAICAC"."SYRCACPARAM"."COMPCODE" = 'ALAI' ) AND  
		( "ALAICAC"."SYRCACPARAM"."PARAMTYPE" = 'PLD' )   ;

IF SQLCA.SQLCODE <> 0 OR li_partialloaddays = 0 OR ISNULL( li_partialloaddays ) THEN
	Messagebox( "Parameter Not Found: PLD", "Partial Load Day parameter is missing (ALAI)!", StopSign!, Ok!)
	RETURN FALSE
END IF

li_partialloaddays = ABS( li_partialloaddays ) * -1
ldt_partialload = RelativeDate ( Today(), li_partialloaddays )

FOR li_ctr = 1 TO 2 
	CHOOSE CASE li_ctr
		CASE 1
			ls_compcode = 'APLN'
			IF ll_countapln <= 0 THEN
				CONTINUE
			END IF
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
	
	dw_lspuploadaptransx.settransobject(SQLCA)
	dw_lspuploadoritemcurrx.settransobject(SQLCA)
	dw_lspuploaddisitemcurrx.settransobject(SQLCA)
	
	dw_lspuploadaptransx.reset()
	dw_lspuploadoritemcurrx.reset()
	dw_lspuploaddisitemcurrx.reset()
	
	dw_lspuploadaptransx.retrieve( ldt_partialload )
	dw_lspuploadoritemcurrx.retrieve( ldt_partialload )
	dw_lspuploaddisitemcurrx.retrieve( ldt_partialload )
	
	dw_lspuploadgrptrans.settransobject(SQLCA)
	dw_lspuploadgrptrans.retrieve( STRING( ldt_processdate, 'YYYYMMDD' ) )

	dw_lspuploadbpytrans.settransobject(SQLCA)
	dw_lspuploadbpytrans.retrieve( STRING( ldt_processdate, 'YYYYMMDD' ) )

	dw_lspuploadbrstrans.settransobject(SQLCA)
	dw_lspuploadbrstrans.retrieve( ldt_partialload )
	
	dw_cheques.settransobject(SQLCA)
	dw_cheques.retrieve()
	
//	ls_recdest = 'lsp' //moved up, before declare statement
	OPEN c_currledge;
	li_sqlcode = sqlca.sqlcode
	
	DO WHILE li_sqlcode = 0 
		YIELD()

		FETCH c_currledge INTO :lstr_currledge.cocode,
								  :lstr_currledge.focode,
								  :lstr_currledge.refno,
								  :lstr_currledge.refdate,
							 	  :lstr_currledge.sourcetype,
								  :lstr_currledge.acctcode,
								  :lstr_currledge.drcr,
								  :lstr_currledge.amount,
								  :lstr_currledge.unit,
								  :lstr_currledge.origcy,
								  :lstr_currledge.loccy,
								  :lstr_currledge.lob,
								  :lstr_currledge.processdate,
								  :lstr_currledge.itemno,
								  :lstr_currledge.recdest,
								  :lstr_currledge.controlno,
								  :lstr_currledge.lspacctype,
	                       :lstr_currledge.lsportype,
								  :lstr_currledge.paytype, 
								  :ls_inpsgn ;
								  
		li_sqlcode = sqlca.sqlcode
								  
		IF li_sqlcode <> 0 THEN
			EXIT
		END IF
			
		ll_processctr = ll_processctr + 1
		lstr_lspcurrent = lstr_lspcurrentnull
		
		lstr_lspcurrent.icdrcd   = lstr_currledge.focode
		lstr_lspcurrent.iacttype = lstr_currledge.lspacctype
		lstr_lspcurrent.inortype = lstr_currledge.lsportype
		lstr_lspcurrent.iactcd   = lstr_currledge.acctcode
		ls_tempamount   = STRING(lstr_currledge.amount,"00000000000000.00")
	   ls_decimaltrim = MID(ls_tempamount,16)
	   ls_wholetrim   = MID(ls_tempamount,4,11)
	   ls_tempamount    = TRIM(ls_wholetrim) + TRIM(ls_decimaltrim)

		lstr_lspcurrent.inpamt   = ls_tempamount
		lstr_lspcurrent.indate   = STRING(lstr_currledge.refdate,'mm/dd/yyyy')
		lstr_lspcurrent.inpsrc   = lstr_currledge.paytype
		lstr_lspcurrent.inpent   = '' 
		lstr_lspcurrent.inpstp   = lstr_currledge.sourcetype
		lstr_lspcurrent.inprdate = STRING(lstr_currledge.refdate,'mmddyyyy')
		lstr_lspcurrent.compcode = lstr_currledge.cocode
		lstr_lspcurrent.procdte  = ls_procdte
		lstr_lspcurrent.userid   = ls_userid 
		ll_grosscomm = 0
		
		CHOOSE CASE lstr_currledge.sourcetype
			CASE 'CD'
	  	      lstr_currledge.refno = TRIM(lstr_currledge.refno)
				ll_rowcountlspaptransx = dw_lspuploadaptransx.rowcount()
				FOR ll_rowcurrentlspaptransx = 1 TO ll_rowcountlspaptransx
					IF TRIM( lstr_currledge.cocode ) = TRIM( dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"compcode") ) AND &
					   TRIM( lstr_currledge.focode ) = TRIM( dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"region") ) AND &
						TRIM(lstr_currledge.refno) = TRIM( dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"docnum")) THEN
						
						lstr_lspcurrent.ipolno   = dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"refdoc")
						ll_lnpos = POS( dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"payor"), '/', 1 )
			         ls_fn    = MID(dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"payor"), ll_lnpos + 1)
         			ll_mipos = POS(ls_fn, '/', ll_lnpos+1)

						if ll_lnpos = 0 THEN
							lstr_lspcurrent.inpln    = dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"payor")
							lstr_lspcurrent.inpfn    = ' '
							lstr_lspcurrent.inpmi    = ' '
						else	
							lstr_lspcurrent.inpln    = MID(dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"payor"), 1, ll_lnpos - 1)
							lstr_lspcurrent.inpfn    = MID(ls_fn, 1, 1)
							lstr_lspcurrent.inpmi    = MID(ls_fn, ll_mipos+1, 1)
						end if	
						ls_docnum                = dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"docnum")
						ls_doctype               = dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"doctype")
						EXIT 
					END IF	
				END FOR
				
				IF ISNULL(lstr_lspcurrent.ipolno) THEN 
					lstr_lspcurrent.ipolno = '          '
				END IF
				IF ISNULL(lstr_lspcurrent.inpln) THEN
					lstr_lspcurrent.inpln = '               '
				END IF
				IF ISNULL(ls_docnum) THEN
					ls_docnum = '       '
				END IF
				ll_grosscomm = 0
				IF TRIM(ls_doctype) = 'CV' THEN
					lstr_lspcurrent.inorno   = ' '
//					lstr_lspcurrent.inpln = RIGHT( lstr_lspcurrent.inpln, 15 )  // Gross Commission
					ll_grosscomm = LONG( RIGHT( lstr_lspcurrent.inpln, 15 ) ) / 100
				END IF
				IF TRIM(ls_doctype) = 'OR' THEN
					lstr_lspcurrent.inorno   = ls_docnum
				END IF

//				IF lstr_currledge.amount < -.001 THEN
//					lstr_lspcurrent.inpsgn   = '*'
//				ELSE
//					lstr_lspcurrent.inpsgn   = ' '
//				END IF
			
				lstr_lspcurrent.iagtcd   = '      '
			
				IF TRIM(ls_doctype) = 'CV' THEN
					lstr_lspcurrent.incvno = ls_docnum
					lstr_lspcurrent.iagtcd = lstr_lspcurrent.ipolno  // For CV, ipolno contains the Agent Code 
					lstr_lspcurrent.ipolno = '          '
				END IF
				
				IF TRIM(ls_doctype) = 'OR' THEN
					lstr_lspcurrent.incvno = '          '
				END IF
				lstr_lspcurrent.inckno   = '      '
   	  	   IF lstr_currledge.paytype = 'C' THEN
					lstr_lspcurrent.inpclrdt = '00000000'
				END IF
				IF lstr_currledge.paytype = 'Q' THEN
					lstr_lspcurrent.inpclrdt = STRING(RelativeDate(lstr_currledge.refdate, 5),'yyyymmdd') 
				END IF
			CASE 'FO'
			   lstr_currledge.refno     = TRIM(lstr_currledge.refno)
				lstr_currledge.controlno = TRIM(lstr_currledge.controlno) 
				lstr_currledge.focode = TRIM( lstr_currledge.focode )
				dw_lspuploadoritemcurrx.SetFilter("focode = '"+ lstr_currledge.focode +" '")
				dw_lspuploadoritemcurrx.Filter()
				ll_rowcountlsporitemcurrx = dw_lspuploadoritemcurrx.rowcount()
				FOR ll_rowcurrentlsporitemcurrx = 1 TO ll_rowcountlsporitemcurrx
					IF TRIM( lstr_currledge.cocode ) <> TRIM( dw_lspuploadoritemcurrx.getitemstring( ll_rowcurrentlsporitemcurrx, "compcode" ) ) AND &
						TRIM( lstr_currledge.focode ) <> TRIM( dw_lspuploadoritemcurrx.getitemstring( ll_rowcurrentlsporitemcurrx, "focode" ) ) THEN
						CONTINUE
					END IF
					
					ls_orno = TRIM(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"orno"))
					ls_polno = TRIM(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"polno"))
					ls_entno = TRIM(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"entno"))
					ldt_ssidate = dw_lspuploadoritemcurrx.getitemdate(ll_rowcurrentlsporitemcurrx,"oritemdtlcurrx_ssiyrmm")
					
					IF (TRIM(lstr_currledge.refno)=ls_orno) or (TRIM(lstr_currledge.refno) = ls_polno) THEN
						if ls_entno <> '' AND NOT ISNULL( ls_entno ) THEN
							lstr_lspcurrent.ipolno = ls_entno
							IF ls_polno <> '' AND NOT ISNULL( ls_polno ) THEN
								lstr_lspcurrent.ipolno = ls_polno
							ELSE
							
								IF LEFT( ls_entno, 1 ) = 'G' OR LEFT( ls_entno, 1 ) = 'S' THEN
									lstr_lspcurrent.ipolno = LEFT( ls_entno, 1 ) + RIGHT( ls_entno, 5 ) + &
										STRING( ldt_ssidate, 'YYMM' )
									IF LEFT( ls_entno, 1 ) = 'S' THEN
//										lstr_lspcurrent.ipolno = 'SS' + RIGHT( ls_entno, 5 ) + &
//											LEFT( STRING( ldt_ssidate, 'MMYY' ), 2 ) + &
//											RIGHT( STRING( ldt_ssidate, 'MMYY' ), 1 )

										lstr_lspcurrent.ipolno = 'SS' + RIGHT( ls_entno, 3 ) + &
											STRING( ldt_ssidate, 'YYMM' ) + '2'
									END IF
								ELSE
									// Assumption is that all Group ICBI has a T1 code
									lstr_lspcurrent.ipolno   = MID( ls_orno,4 )
								END IF
							END IF
							
							IF TRIM( lstr_currledge.acctcode ) = '375008' THEN  // New Business Account
								lstr_lspcurrent.ipolno   = MID( ls_orno,4 )
							END IF
						elseif ls_polno='' then
							IF TRIM( dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"applno") ) <> '' THEN
								lstr_lspcurrent.ipolno = 'A' + TRIM( dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"applno") )
							ELSE
								lstr_lspcurrent.ipolno   = MID( ls_orno,4 )
							END IF
						else
						   lstr_lspcurrent.ipolno   = ls_polno
						end if	
						ll_lnpos = POS(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"clientname"), '/', 1 )
			         ls_fn    = MID(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"clientname"), ll_lnpos + 1)
         			ll_mipos = POS(ls_fn, '/', ll_lnpos+1)

						if ll_lnpos = 0 THEN
							lstr_lspcurrent.inpln    = dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"clientname")
							lstr_lspcurrent.inpfn    = ' '
							lstr_lspcurrent.inpmi    = ' '
						else	
							lstr_lspcurrent.inpln    = MID(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"clientname"), 1, ll_lnpos - 1)
							lstr_lspcurrent.inpfn    = MID(ls_fn, 1, 1)
							lstr_lspcurrent.inpmi    = MID(ls_fn, ll_mipos+1, 1)
						end if	
						lstr_lspcurrent.inorno   = dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"orno")
						lstr_lspcurrent.iagtcd   = dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"agtno")
						EXIT 
					END IF	
				END FOR
				
				dw_lspuploadoritemcurrx.SetFilter("")
				dw_lspuploadoritemcurrx.Filter()
						
				IF ISNULL(lstr_lspcurrent.ipolno) THEN 
					lstr_lspcurrent.ipolno = '          '
				END IF
				IF ISNULL(lstr_lspcurrent.inpln) THEN
				lstr_lspcurrent.inpln = '               '
				END IF
				IF ISNULL(lstr_lspcurrent.inpfn) THEN
					lstr_lspcurrent.inpfn = ' '
				END IF
				IF ISNULL(lstr_lspcurrent.inpmi) THEN
					lstr_lspcurrent.inpmi = ' '
				END IF
//				IF lstr_currledge.amount < -.001 THEN
//					lstr_lspcurrent.inpsgn   = '*'
//				ELSE
//					lstr_lspcurrent.inpsgn   = ' '
//				END IF
				lstr_lspcurrent.incvno   = '          '
				lstr_lspcurrent.inckno   = '      '
	         IF TRIM(lstr_currledge.paytype) = 'C' THEN
					if lstr_currledge.origcy='PHP' then
						lstr_lspcurrent.inpclrdt = '00000000'
					else
						ldt_clearing = wf_clearing( lstr_currledge.refdate, 'N' )
						lstr_lspcurrent.inpclrdt = string( ldt_clearing, "yyyymmdd")
					end if	
				END IF
				IF TRIM(lstr_currledge.paytype) = 'Q' THEN
					ls_clrtype = 'I'   // Default clearing
					ll_chequesrowcount = dw_cheques.rowcount()
						FOR ll_chequesrowccurrent = 1 TO ll_chequesrowcount
							IF TRIM( lstr_currledge.cocode ) <> TRIM( dw_cheques.getitemstring( ll_chequesrowccurrent, "compcode" ) ) OR &
								TRIM( lstr_currledge.focode ) <> TRIM( dw_cheques.getitemstring( ll_chequesrowccurrent, "focode" ) ) OR &
								TRIM( lstr_currledge.refno ) <> TRIM( dw_cheques.getitemstring( ll_chequesrowccurrent, "orno" ) ) 	THEN
								CONTINUE
							else
								exit
							END IF
						NEXT					
						
						ls_clrtype = TRIM(dw_cheques.getitemstring(ll_chequesrowccurrent,"checkclrty"))
						ls_chktype = TRIM(dw_cheques.getitemstring(ll_chequesrowccurrent,"checktype"))
						
						if trim(ls_clrtype)<>''	then	
							ldt_clearing = wf_clearing(lstr_currledge.refdate, trim(ls_clrtype) )
							lstr_lspcurrent.inpclrdt = string( ldt_clearing, "yyyymmdd" )
						elseif trim(ls_chktype)<>'' then	
							ldt_clearing = wf_clearing( lstr_currledge.refdate, trim(ls_chktype) )
							lstr_lspcurrent.inpclrdt = string(wf_clearing(lstr_currledge.refdate,trim(ls_chktype)),"yyyymmdd")
						else
							ldt_clearing = wf_clearing( lstr_currledge.refdate,'A' )
							lstr_lspcurrent.inpclrdt = string( ldt_clearing, "yyyymmdd" )
						end if	
				END IF
			CASE 'FC'
				lstr_currledge.refno     = TRIM(lstr_currledge.refno)
				lstr_currledge.controlno = TRIM(lstr_currledge.controlno) 
				ll_rowcountlspdisitemcurrx = dw_lspuploaddisitemcurrx.rowcount()
				FOR ll_rowcurrentlspdisitemcurrx = 1 TO ll_rowcountlspdisitemcurrx
					IF TRIM( lstr_currledge.cocode ) = TRIM( dw_lspuploaddisitemcurrx.getitemstring( ll_rowcurrentlspdisitemcurrx, "compcode" ) ) AND &
						TRIM( lstr_currledge.focode ) = TRIM( dw_lspuploaddisitemcurrx.getitemstring( ll_rowcurrentlspdisitemcurrx, "focode" ) ) AND &
					   TRIM( lstr_currledge.refno) = TRIM( dw_lspuploaddisitemcurrx.getitemstring( ll_rowcurrentlspdisitemcurrx, "disno" ) ) THEN
						
						lstr_lspcurrent.ipolno   = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"polno")
						ll_lnpos = POS(dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"clientname"), '/', 1 )
			         ls_fn    = MID(dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"clientname"), ll_lnpos + 1)
         			ll_mipos = POS(ls_fn, '/', ll_lnpos+1)

						if ll_lnpos = 0 THEN
							lstr_lspcurrent.inpln    = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"clientname")
							lstr_lspcurrent.inpfn    = ' '
							lstr_lspcurrent.inpmi    = ' '
						else	
							lstr_lspcurrent.inpln    = MID(dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"clientname"), 1, ll_lnpos - 1)
							lstr_lspcurrent.inpfn    = MID(ls_fn, 1, 1)
							lstr_lspcurrent.inpmi    = MID(ls_fn, ll_mipos+1, 1)
						end if	
						lstr_lspcurrent.incvno   = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"disno")
						lstr_lspcurrent.inckno   = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"checkno")
						lstr_lspcurrent.iagtcd   = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"agtno")
						ll_grosscomm 				 = dw_lspuploaddisitemcurrx.getitemdecimal(ll_rowcurrentlspdisitemcurrx,"disamt")
						EXIT 
					END IF	
				END FOR

				IF ISNULL(lstr_lspcurrent.ipolno) THEN 
					lstr_lspcurrent.ipolno = '          '
				END IF
				IF ISNULL(lstr_lspcurrent.inpln) THEN
					lstr_lspcurrent.inpln = '               '
				END IF
				IF ISNULL(lstr_lspcurrent.inpfn) THEN
					lstr_lspcurrent.inpfn = ' '
				END IF
				IF ISNULL(lstr_lspcurrent.inpmi) THEN
					lstr_lspcurrent.inpmi = ' '
				END IF
//				IF lstr_currledge.amount < -.001 THEN
//					lstr_lspcurrent.inpsgn   = '*'
//				ELSE
//					lstr_lspcurrent.inpsgn   = ' '
//				END IF
				lstr_lspcurrent.inorno   = '       '
         	  IF TRIM(lstr_currledge.paytype) = 'C' THEN
		      	  lstr_lspcurrent.inpclrdt = '00000000'
			     END IF
      	     IF TRIM(lstr_currledge.paytype) = 'Q' THEN
   				  lstr_lspcurrent.inpclrdt = STRING(RelativeDate(lstr_currledge.refdate, 5),'yyyymmdd') 
	   		  END IF
			CASE 'BR'
				lstr_currledge.refno     = TRIM(lstr_currledge.refno)
				ll_totalbpy = dw_lspuploadbpytrans.rowcount()
				FOR ll_currentbpy = 1 TO ll_totalbpy
					IF TRIM( lstr_currledge.refno) = TRIM( dw_lspuploadbpytrans.getitemstring( ll_currentbpy, "inorno" ) ) AND &
						TRIM( lstr_currledge.controlno ) = TRIM( dw_lspuploadbpytrans.getitemstring( ll_currentbpy, "iagtcd" ) ) THEN						
						
						lstr_lspcurrent.ipolno   = dw_lspuploadbpytrans.getitemstring(ll_currentbpy,"ipolno")
						lstr_lspcurrent.inpln    = dw_lspuploadbpytrans.getitemstring(ll_currentbpy,"inpln")
						lstr_lspcurrent.inpfn    = dw_lspuploadbpytrans.getitemstring(ll_currentbpy,"inpfn")
						lstr_lspcurrent.inpmi    = dw_lspuploadbpytrans.getitemstring(ll_currentbpy,"inpmi")
						lstr_lspcurrent.incvno   = dw_lspuploadbpytrans.getitemstring(ll_currentbpy,"incvno")
						lstr_lspcurrent.inckno   = dw_lspuploadbpytrans.getitemstring(ll_currentbpy,"inckno")
						lstr_lspcurrent.iagtcd   = TRIM( dw_lspuploadbpytrans.getitemstring(ll_currentbpy,"iagtcd") )
						
						IF LEN( lstr_lspcurrent.iagtcd ) < 9 THEN 
							lstr_lspcurrent.iagtcd = f_padleftzero( lstr_lspcurrent.iagtcd, 9 )
						END IF
						
						EXIT 
					END IF	
				END FOR

				IF ISNULL(lstr_lspcurrent.ipolno) THEN 
					lstr_lspcurrent.ipolno = '          '
				END IF
				IF ISNULL(lstr_lspcurrent.inpln) THEN
					lstr_lspcurrent.inpln = '               '
				END IF
				IF ISNULL(lstr_lspcurrent.inpfn) THEN
					lstr_lspcurrent.inpfn = ' '
				END IF
				IF ISNULL(lstr_lspcurrent.inpmi) THEN
					lstr_lspcurrent.inpmi = ' '
				END IF
				
//				IF lstr_currledge.amount < -.001 THEN
//					lstr_lspcurrent.inpsgn   = '*'
//				ELSE
//					lstr_lspcurrent.inpsgn   = ' '
//				END IF
//				lstr_lspcurrent.inorno   = '       '

         	IF TRIM(lstr_currledge.paytype) = 'C' THEN
		         lstr_lspcurrent.inpclrdt = '00000000'
			   END IF
      	   IF TRIM(lstr_currledge.paytype) = 'Q' THEN
   			   lstr_lspcurrent.inpclrdt = STRING(RelativeDate(lstr_currledge.refdate, 5),'yyyymmdd') 
	   		END IF
			CASE 'GR'
				lstr_currledge.refno     = TRIM(lstr_currledge.refno)
				ll_totalgrp = dw_lspuploadgrptrans.rowcount()
				
				FOR ll_currentgrp = 1 TO ll_totalgrp
					IF TRIM( lstr_currledge.refno) = TRIM( dw_lspuploadgrptrans.getitemstring( ll_currentgrp, "ipolno" ) ) + &
					            TRIM( dw_lspuploadgrptrans.getitemstring( ll_currentgrp, "inpent" ) ) THEN
						
						lstr_lspcurrent.ipolno   = dw_lspuploadgrptrans.getitemstring(ll_currentgrp, "ipolno")
						lstr_lspcurrent.inpln    = dw_lspuploadgrptrans.getitemstring(ll_currentgrp, "inpln")
						lstr_lspcurrent.inpfn    = dw_lspuploadgrptrans.getitemstring(ll_currentgrp, "inpfn")
						lstr_lspcurrent.inpmi    = dw_lspuploadgrptrans.getitemstring(ll_currentgrp, "inpmi")
						lstr_lspcurrent.incvno   = dw_lspuploadgrptrans.getitemstring(ll_currentgrp, "incvno")
						lstr_lspcurrent.inckno   = dw_lspuploadgrptrans.getitemstring(ll_currentgrp,"inckno")
						lstr_lspcurrent.iagtcd   = dw_lspuploadgrptrans.getitemstring(ll_currentgrp,"iagtcd")
						lstr_lspcurrent.inpent   = dw_lspuploadgrptrans.getitemstring(ll_currentgrp,"inpent")
						EXIT 
					END IF	
				END FOR

				IF ISNULL(lstr_lspcurrent.ipolno) THEN 
					lstr_lspcurrent.ipolno = '          '
				END IF
				IF ISNULL(lstr_lspcurrent.inpln) THEN
					lstr_lspcurrent.inpln = '               '
				END IF
				IF ISNULL(lstr_lspcurrent.inpfn) THEN
					lstr_lspcurrent.inpfn = ' '
				END IF
				IF ISNULL(lstr_lspcurrent.inpmi) THEN
					lstr_lspcurrent.inpmi = ' '
				END IF
				
//				IF lstr_currledge.amount < -.001 THEN
//					lstr_lspcurrent.inpsgn   = '*'
//				ELSE
//					lstr_lspcurrent.inpsgn   = ' '
//				END IF
//				lstr_lspcurrent.inorno   = '       '

         	IF TRIM(lstr_currledge.paytype) = 'C' THEN
		         lstr_lspcurrent.inpclrdt = '00000000'
			   END IF
      	   IF TRIM(lstr_currledge.paytype) = 'Q' THEN
   			   lstr_lspcurrent.inpclrdt = STRING(RelativeDate(lstr_currledge.refdate, 5),'yyyymmdd') 
	   		END IF

			CASE 'BI'
				lstr_lspcurrent.ipolno = ''
				lstr_lspcurrent.inpln  = ''
				lstr_lspcurrent.iagtcd = ''
				lstr_lspcurrent.inpclrdt = '00000000'
				lstr_lspcurrent.inpfn    = ''
				lstr_lspcurrent.inpmi    = ''
				lstr_lspcurrent.incvno   = ''
				lstr_lspcurrent.inckno   = ''
				lstr_lspcurrent.inpsgn   = ''
				lstr_lspcurrent.inpstp   = 'BR'
				li_chkclrno = 0
				
				lstr_currledge.cocode  = TRIM( lstr_currledge.cocode )
				lstr_currledge.refno   = TRIM( lstr_currledge.refno )

				ll_totalbrs = dw_lspuploadbrstrans.rowcount()
				FOR ll_currentbrs = 1 TO ll_totalbrs
					IF TRIM( lstr_currledge.cocode) = TRIM( dw_lspuploadbrstrans.getitemstring( ll_currentbrs, "cocode" ) ) AND &
					   TRIM( lstr_currledge.refno) = TRIM( dw_lspuploadbrstrans.getitemstring( ll_currentbrs, "refno" ) ) AND &
					   lstr_currledge.refdate = dw_lspuploadbrstrans.getitemdate( ll_currentbrs, "refdate" ) AND &
					   lstr_currledge.itemno = dw_lspuploadbrstrans.getitemnumber( ll_currentbrs, "itemno" ) THEN
						
						lstr_lspcurrent.ipolno   = TRIM( dw_lspuploadbrstrans.getitemstring(ll_currentbrs, "polno") )
						lstr_lspcurrent.inpln    = TRIM( dw_lspuploadbrstrans.getitemstring(ll_currentbrs, "clientname") )
						lstr_lspcurrent.iagtcd   = TRIM( dw_lspuploadbrstrans.getitemstring(ll_currentbrs, "agentcode") )
						li_chkclrno              = dw_lspuploadbrstrans.getitemnumber( ll_currentbrs, "chkclrno" )

						IF LEN( lstr_lspcurrent.iagtcd ) < 9 THEN 
							lstr_lspcurrent.iagtcd = f_padleftzero( lstr_lspcurrent.iagtcd, 9 )
						END IF
						
						EXIT 
					END IF	
				END FOR

//         	IF TRIM(lstr_currledge.paytype) = 'C' THEN
//		         lstr_lspcurrent.inpclrdt = '00000000'
//			   END IF
//				
//      	   IF TRIM(lstr_currledge.paytype) = 'Q' THEN
					li_bankdays=0
					ldt_cleardate = lstr_currledge.refdate
					
					DO WHILE li_bankdays < li_chkclrno
						ldt_cleardate = RelativeDate ( ldt_cleardate, 1 )
						
						IF DayNumber( ldt_cleardate ) = 7 OR DayNumber( ldt_cleardate ) = 1 THEN
						ELSEIF f_holiday( ldt_cleardate ) THEN
						ELSE
							li_bankdays ++
						END IF
					LOOP
					
   			   lstr_lspcurrent.inpclrdt = STRING( ldt_cleardate, 'yyyymmdd' ) 
//	   		END IF

			END CHOOSE
			
			IF TRIM( lstr_currledge.origcy ) = 'USD' THEN
				lstr_lspcurrent.compcode = 'ALDC'
			END IF
			
			ls_lspcurrent = ''
	   	ls_lspcurrent = STRING(lstr_lspcurrent.compcode, "@@@@")
		   ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.icdrcd, "@@@")
			
			// NB Business Application No.
			
//			IF TRIM( lstr_lspcurrent.iactcd ) = '375008' OR ( lstr_lspcurrent.iacttype = 'C' AND &
//			   lstr_lspcurrent.inortype = '2' AND  TRIM( lstr_lspcurrent.iactcd )  = '100007' ) OR &
//				( lstr_lspcurrent.iacttype = 'R' AND &
//			   lstr_lspcurrent.inortype = '1' AND  TRIM( lstr_lspcurrent.iactcd )  = '375040' ) THEN
//				lstr_lspcurrent.ipolno = 'A' + LEFT( TRIM( lstr_lspcurrent.ipolno ), 9 )
//			END IF
//			
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.ipolno,   "@@@@@@@@@@")
	  	   ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpln,    "@@@@@@@@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpfn,    "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpmi,    "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.iacttype, "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inortype, "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.iactcd,   "@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(ls_inpsgn,   "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpamt,   "@@@@@@@@@@@@@")
//			ls_iornum = MID(lstr_lspcurrent.inorno,4)
			ls_iornum = TRIM( lstr_lspcurrent.inorno )
			ls_lspcurrent = ls_lspcurrent + STRING(ls_iornum,   "@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(DATE(lstr_lspcurrent.indate), "yyyymmdd")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpsrc,   "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpent,   "@@@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpstp,   "@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.iagtcd,   "@@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.incvno,   "@@@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inckno,   "@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inprdate, "@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(DATE(lstr_lspcurrent.inpclrdt),"yyyymmdd")
			
			IF li_ctr = 1 THEN
				FILEWRITE(li_FileNumapln,ls_lspcurrent)
			ELSEIF li_ctr = 2 THEN
				FILEWRITE(li_fileNumalai,ls_lspcurrent)
			END IF
		
			ls_icomp    = STRING(lstr_lspcurrent.compcode, "@@@@")
			ls_icdrcd   = STRING(lstr_lspcurrent.icdrcd, "@@@")
			
			ls_ipolno   = f_padleftspace( TRIM( lstr_lspcurrent.ipolno ), 10 ) 
			ls_ipolno   = STRING( ls_ipolno, "@@@@@@@@@@" )
			
			ls_inpln    = STRING(lstr_lspcurrent.inpln,    "@@@@@@@@@@@@@@@")
			ls_inpfn    = STRING(lstr_lspcurrent.inpfn,    "@")
			ls_inpmi    = STRING(lstr_lspcurrent.inpmi,    "@")
			ls_inpact   = STRING(lstr_lspcurrent.iacttype, "@")
			ls_inpopt   = STRING(lstr_lspcurrent.inortype, "@")
			IF LEN(lstr_lspcurrent.iactcd) <> 0 THEN
			   ll_iactcd = LONG(lstr_lspcurrent.iactcd)
			END IF
//			ls_inpsgn   = lstr_lspcurrent.inpsgn
			ldec_inpamt = DEC(STRING(lstr_currledge.amount,"00000000000000.00"))
			
			IF LEN(lstr_lspcurrent.inorno) <> 0 AND lstr_currledge.sourcetype <> 'BR' AND lstr_currledge.sourcetype <> 'GR' THEN
				IF LEN( TRIM( lstr_lspcurrent.inorno ) ) > 7 THEN
					ls_iornum   = MID(lstr_lspcurrent.inorno,4)
				ELSE
					ls_iornum   = TRIM( lstr_lspcurrent.inorno )
				END IF
//			   ls_iornum   = MID(lstr_lspcurrent.inorno,4)
//			   ls_iornum   = TRIM( lstr_lspcurrent.inorno )
			END IF
			
			li_iordtc   = INTEGER(MID(lstr_lspcurrent.indate,7,2))
			li_iordty   = INTEGER(MID(lstr_lspcurrent.indate,9,2))
			li_iordtm   = INTEGER(MID(lstr_lspcurrent.indate,1,2))
			li_iordtd   = INTEGER(MID(lstr_lspcurrent.indate,4,2))
			ls_inpsrc   = STRING(lstr_lspcurrent.inpsrc,   "@")
			ls_inpent   = STRING(lstr_lspcurrent.inpent,   "@@@@@@@@@@")
			ls_inpstp   = STRING(lstr_lspcurrent.inpstp,   "@@")
			ls_iagtcd   = STRING(lstr_lspcurrent.iagtcd,   "@@@@@@@@@")
			ls_incvno   = TRIM( STRING(lstr_lspcurrent.incvno,   "@@@-@@@@@@@") )
			IF ls_incvno = '-' THEN ls_incvno = ''
			ls_inckno   = STRING(lstr_lspcurrent.inckno,   "@@@@@@")
			ls_inprdt	= STRING(TODAY(),'yyyymmdd')
   	   ls_iclrdt   = lstr_lspcurrent.inpclrdt
			
			IF ISNULL( ls_inpsgn ) THEN
				ls_inpsgn = ''
			END IF
			
			// Agent Balances SOA should be skipped
			
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
					MessageBox("SQL error", SQLCA_ALMODDATA.SQLErrText)
					ROLLBACK USING SQLCA_ALMODDATA;
					CLOSE(w_lspupload)
					RETURN FALSE
				END IF
			END IF
	
			li_percent      = (ll_processctr / ll_count ) * 100
	   	st_percent.text = string(li_percent) + "%" + " Complete"
		   st_process.text = string(ll_processctr)
		   hpb_1.position  = li_percent 
		LOOP
	
		IF li_ctr = 1 THEN
			FILECLOSE(li_fileNumapln)
		END IF
		IF li_ctr = 2 THEN
			FILECLOSE(li_fileNumalai)
		END IF
		CLOSE c_currledge;
NEXT

IF ll_nlsp_total > 0 THEN
	BOOLEAN lb_nlspupload
	
	lb_nlspupload = wf_loadnlsp()

	IF lb_nlspupload THEN
		MessageBox("Information","File created..")	
	END IF
	
	CLOSE(w_lspupload)
	
	RETURN lb_nlspupload
END IF

COMMIT USING SQLCA_ALMODDATA;
MessageBox("Information","File created..")	

/////////////////////////////////////  Home Service Extract //////////////////////////////////////
DW_JRO.settransobject(SQLCA)
string s_compcode, s_focode, s_disnum, s_polno, new_row, s_filename, s_rows, s_amount
date d_premdate
long n_premded, n_rowcount, n_ctr
integer li_FileNum, retval

dw_jro.retrieve(TODAY())

n_rowcount = dw_jro.rowcount()

if n_rowcount > 0 then
	s_filename=string(dw_jro.getitemdate(1,"itrdate"),"yyyymmdd")
	s_rows=f_padleftzero (string(n_rowcount,"########"), 5)
	s_amount=f_padleftzero (string(dw_jro.getitemnumber(1,"total_amount"),"########"), 9)
	
	DECLARE PremDed CURSOR FOR  
	select DISITEMCURRX.COMPCODE,
			 DISITEMCURRX.FOCODE,
			 disitemcurrx.disno as disnum, 
			 polno AS POLNO, 
			 dismaincurrx.DISDATE AS premdate, 
			 disDEDamt * 100 AS premded 
	from DISMAINCURRX, 
	disitemcurrx, 
	disitemdtlcurrx, 
	disitemdtldedcurrx
		WHERE ( DISITEMCURRX.COMPCODE = DISMAINCURRX.COMPCODE ) and  
				( DISITEMCURRX.FOCODE = DISMAINCURRX.FOCODE ) and  
				( DISITEMCURRX.DISFORM = DISMAINCURRX.DISFORM ) and  
				( DISITEMCURRX.DISNO = DISMAINCURRX.DISNO ) and  
				( DISITEMCURRX.DISDATE = DISMAINCURRX.DISDATE ) and DISSTATCOD<>'C' and
				( DISITEMCURRX.COMPCODE = DISITEMDTLCURRX.COMPCODE ) and  
				( DISITEMCURRX.FOCODE = DISITEMDTLCURRX.FOCODE ) and  
				( DISITEMCURRX.DISFORM = DISITEMDTLCURRX.DISFORM ) and  
				( DISITEMCURRX.DISNO = DISITEMDTLCURRX.DISNO ) and  
				( DISITEMCURRX.DISDATE = DISITEMDTLCURRX.DISDATE ) and 
				( DISITEMCURRX.COMPCODE = DISITEMDTLDEDCURRX.COMPCODE ) and  
				( DISITEMCURRX.FOCODE = DISITEMDTLDEDCURRX.FOCODE ) and  
				( DISITEMCURRX.DISFORM = DISITEMDTLDEDCURRX.DISFORM ) and  
				( DISITEMCURRX.DISNO = DISITEMDTLDEDCURRX.DISNO ) and  
				( DISITEMCURRX.DISDATE = DISITEMDTLDEDCURRX.DISDATE ) AND 
				prodcode='H' and dedcode in ('005','008') and disdedamt>0 AND
				dismaincurrx.DISDATE=CURRENT DATE;
	
	OPEN PremDed;
	DO WHILE SQLCA.SQLCODE = 0 
		FETCH PremDed INTO :s_compcode, :s_focode, :s_disnum, :s_polno, :d_premdate, :n_premded;
		IF SQLCA.SQLCODE <> 0 THEN
			EXIT 
		END IF
	
		FOR n_ctr=1 TO n_rowcount 
			if (s_compcode=dw_jro.getitemstring(n_ctr,"compcode")) and (s_focode=dw_jro.getitemstring(n_ctr,"focode")) and (s_disnum=dw_jro.getitemstring(n_ctr,"disno")) and (s_polno=dw_jro.getitemstring(n_ctr,"ipolno")) and (d_premdate=dw_jro.getitemdate(n_ctr,"itrdate")) then
				dw_jro.SetItem(n_ctr,"iadamt", f_padleftzero (string(n_premded,"#######"), 7))
				exit
			end if	
		NEXT
	LOOP
	CLOSE PremDed;
	
retval=1
li_FileNum = -1
	DO WHILE li_FileNum = -1
		li_FileNum = FileOpen("I:\HOMESERV\INPUT\"+s_filename+".HSC", LineMode!, Write!, LockWrite!, Replace!)
		if li_FileNum = -1 then
			retval=MessageBox("Error","Can't write to the path I:\HOMESERV\INPUT\~nMap this drive first.~nClick OK to retry, Cancel or Esc to skip this routine.",Exclamation!,OKCancel!)
		else
			retval=1	
		end if
		if retval<>1 then 
			return TRUE
		END IF	
	LOOP
		FOR n_ctr=1 TO n_rowcount 
					new_row=left(dw_jro.getitemstring(n_ctr,"ipolno"),11)+ &
					string(dw_jro.getitemdate(n_ctr,"itrdate"),"yyyymmdd")+ &
					dw_jro.getitemstring(n_ctr,"itrcde")+ &
					f_padleftzero (string(dw_jro.getitemnumber(n_ctr,"ibnamt"),"#######"), 7)+ &
					dw_jro.getitemstring(n_ctr,"iendow")+ &
					dw_jro.getitemstring(n_ctr,"ipuac")+ &
					dw_jro.getitemstring(n_ctr,"inspbt")+ &
					dw_jro.getitemstring(n_ctr,"iadamt")+ &
					dw_jro.getitemstring(n_ctr,"iadsgn")+ &
					dw_jro.getitemstring(n_ctr,"iadint")+ &
					dw_jro.getitemstring(n_ctr,"ioloan")+ &
					dw_jro.getitemstring(n_ctr,"iolint")+ &
					dw_jro.getitemstring(n_ctr,"idlp")+ &
					dw_jro.getitemstring(n_ctr,"ienddt")+ &
					dw_jro.getitemstring(n_ctr,"idthdt")
					FileWrite(li_FileNum, new_row)
		NEXT
	
	FileClose(li_FileNum)
	
	li_FileNum = FileOpen("I:\HOMESERV\INPUT\"+s_filename+".CTL", LineMode!, Write!, LockWrite!, Replace!)
	if FileWrite(li_FileNum, s_filename+'.HSC'+s_rows+s_amount) = -1 then
		MessageBox("Error","There was an error creating the file.",Exclamation!)
	else	
		MessageBox("Successful","File was saved to I:\HOMESERV\INPUT\"+s_filename+".HSC",Information!)
	end if
	FileClose(li_FileNum)
end if
CLOSE(w_lspupload)

RETURN TRUE
end event

public function boolean wf_loadnlsp ();STRING  ls_icomp,ls_compcode, ls_recdest , ls_userid, ls_procdte, ls_doctype, ls_docnum, ls_lspcurrent, ls_filealai,ls_fileapln, ls_tempamount, ls_decimaltrim,ls_wholetrim
STRING  ls_icdrcd,ls_ipolno,ls_inpln,ls_inpfn,ls_inpmi,ls_inpact,ls_inpopt,ls_inpsgn,ls_iornum
STRING  ls_inpsrc,ls_inpent,ls_inpstp,ls_iagtcd,ls_incvno,ls_inckno,ls_inprdt,ls_iclrdt
LONG    ll_countalai, ll_countapln, ll_count , ll_processctr, ll_rowcurrentlspaptransx,ll_rowcountlspaptransx, ll_rowcurrentlsporitemcurrx,ll_rowcountlsporitemcurrx,ll_rowcurrentlspdisitemcurrx,ll_rowcountlspdisitemcurrx, ll_insertrow
INTEGER li_ctr_proc, li_percent,li_iordtc,li_iordty,li_iordtm,li_iordtd, li_recdest
LONG ll_iactcd
DATE    ldte_vdate,ldte_inprdate, ldte_inpclrdt, ldt_ssidate
TIME    lt_start , lt_now 
DECIMAL ldec_inpamt
LONG ll_nlsp_acctcode_ctr, ll_nlsp_alai, ll_nlsp_apln, ll_nlsp_total, ll_grosscomm
STRING  ls_nlsp_acctcode, ls_orno, ls_polno, ls_entno
DATE    ldt_proc7days
INTEGER li_sqlcode, li_sqlcode1

STR_CURRLEDGE lstr_currledge, lstr_currledgenull
STR_LSPCURRENT lstr_lspcurrent, lstr_lspcurrentnull

ls_recdest  = 'lsp'
ls_compcode = 'APLN'
ls_userid   = TRIM(SQLCA.userid)
ls_procdte  = STRING(TODAY(), 'mm/dd/yyyy')
ls_fileapln = 'c:\cacent~~1\lspapln\UN_'+STRING(TODAY(),'mm')+STRING(TODAY(),'dd')+'.lsp'
ls_filealai = 'c:\cacent~~1\lspalai\UN_'+STRING(TODAY(),'mm')+STRING(TODAY(),'dd')+'.lsp'
si_sw  = 1 
DECLARE c_nlsp1 CURSOR FOR
  SELECT "SYRNLSPUPLD"."ACCTCODE"  
    FROM "SYRNLSPUPLD"  
   WHERE "SYRNLSPUPLD"."COMPCODE" = :ls_compcode ;

// Count how many NLSP records will be loaded for APLN & ALAI

ls_recdest = 'nlsp'
FOR li_ctr_proc = 1 TO 2
	IF li_ctr_proc = 1 THEN
		ls_compcode = 'ALAI'
	ELSE
		ls_compcode = 'APLN'
	END IF

	OPEN c_nlsp1 ;
	li_sqlcode1 = sqlca.sqlcode
	
	DO WHILE li_sqlcode1 = 0 
		YIELD()

		FETCH c_nlsp1 INTO :lstr_currledge.acctcode ;
		li_sqlcode1 = sqlca.sqlcode
		
		IF li_sqlcode1 = 100 THEN
			EXIT
		END IF
	
		SELECT COUNT( * ) INTO :ll_nlsp_acctcode_ctr FROM "CURRLEDGE"
			WHERE "CURRLEDGE"."ACCTCODE" = :lstr_currledge.acctcode AND
					"CURRLEDGE"."COCODE" = :ls_compcode AND 
					"CURRLEDGE"."RECDEST" = :ls_recdest ;
				
		IF ISNULL(ll_nlsp_acctcode_ctr) THEN
			ll_nlsp_acctcode_ctr = 0
		END IF
		
		IF ls_compcode = 'ALAI' THEN
			ll_nlsp_alai += ll_nlsp_acctcode_ctr
		ELSE
			ll_nlsp_apln += ll_nlsp_acctcode_ctr
		END IF
	LOOP
	CLOSE c_nlsp1 ;
NEXT

ll_nlsp_total = ll_nlsp_alai + ll_nlsp_apln

DECLARE c_currledge_nlsp1 CURSOR FOR  
SELECT CURRLEDGE.COCODE,   
       CURRLEDGE.FOCODE,   
       CURRLEDGE.REFNO,   
       CURRLEDGE.REFDATE,   
       CURRLEDGE.SOURCETYPE,   
       CURRLEDGE.ACCTCODE,   
       CURRLEDGE.DRCR,   
       CURRLEDGE.AMOUNT,   
       CURRLEDGE.UNIT,   
       CURRLEDGE.ORIGCY,   
       CURRLEDGE.LOCCY,   
       CURRLEDGE.LOB,   
       CURRLEDGE.PROCESSDATE,   
       CURRLEDGE.ITEMNO,   
       CURRLEDGE.RECDEST,   
       CURRLEDGE.CONTROLNO,   
       CURRLEDGE.LSPACCTYPE,   
       CURRLEDGE.LSPORTYPE,   
       CURRLEDGE.PAYTYPE,
		 CURRLEDGE.NUMBERSIGN
FROM  CURRLEDGE 
WHERE CURRLEDGE.COCODE  = :ls_compcode AND
      CURRLEDGE.RECDEST = :ls_recdest AND 
		CURRLEDGE.ACCTCODE = :ls_nlsp_acctcode 
ORDER BY CURRLEDGE.COCODE,   
         CURRLEDGE.RECDEST, 
			CURRLEDGE.SOURCETYPE, 
	      CURRLEDGE.FOCODE,   
       	CURRLEDGE.REFNO,   
			CURRLEDGE.ACCTCODE DESC ;

ll_processctr   =  0
st_process.text = '0'
st_percent.text = '0' + "%" + " Complete"
st_read.text    = STRING(ll_nlsp_total)

ldt_proc7days = RelativeDate ( Today(), -7 )

dw_lspuploadaptransx.settransobject(SQLCA);
dw_lspuploadoritemcurrx.settransobject(SQLCA);
dw_lspuploaddisitemcurrx.settransobject(SQLCA);
	
dw_lspuploadaptransx.reset()
dw_lspuploadoritemcurrx.reset()
dw_lspuploaddisitemcurrx.reset()
dw_lspuploadaptransx.retrieve( ldt_proc7days );
dw_lspuploadoritemcurrx.retrieve( ldt_proc7days );
dw_lspuploaddisitemcurrx.retrieve( ldt_proc7days );

FOR li_ctr_proc = 1 TO 2 
	CHOOSE CASE li_ctr_proc
	CASE 1
		ls_compcode = 'APLN'
		IF ll_nlsp_apln <= 0 THEN
			CONTINUE
		END IF
		integer li_FileNumapln
      li_FileNumapln = FileOpen(ls_fileapln, LineMode!, Write!, LockWrite!, Append! )
	CASE 2
		ls_compcode = 'ALAI'
		IF ll_nlsp_alai <= 0 THEN
			CONTINUE
		END IF 
		integer li_FileNumalai
      li_FileNumalai = FileOpen(ls_filealai, StreamMode!, Write!, LockWrite!, Append! )
	END CHOOSE
	
	ls_recdest = 'nlsp'
	
	OPEN c_nlsp1 ;
	li_sqlcode = sqlca.sqlcode

	DO WHILE li_sqlcode = 0 
		FETCH c_nlsp1 INTO :ls_nlsp_acctcode ;
		li_sqlcode = sqlca.sqlcode

		IF sqlca.sqlcode = 100 THEN
			EXIT
		END IF
		
		OPEN c_currledge_nlsp1 ;
		li_sqlcode1 = sqlca.sqlcode

		DO WHILE li_sqlcode1 = 0 
			YIELD()
			
			FETCH c_currledge_nlsp1 INTO :lstr_currledge.cocode,
						  :lstr_currledge.focode,
						  :lstr_currledge.refno,
						  :lstr_currledge.refdate,
					 	  :lstr_currledge.sourcetype,
						  :lstr_currledge.acctcode,
						  :lstr_currledge.drcr,
						  :lstr_currledge.amount,
						  :lstr_currledge.unit,
						  :lstr_currledge.origcy,
						  :lstr_currledge.loccy,
						  :lstr_currledge.lob,
						  :lstr_currledge.processdate,
						  :lstr_currledge.itemno,
						  :lstr_currledge.recdest,
						  :lstr_currledge.controlno,
						  :lstr_currledge.lspacctype,
                    :lstr_currledge.lsportype,
						  :lstr_currledge.paytype, 
						  :ls_inpsgn;
						  
			li_sqlcode1 = sqlca.sqlcode
		
			IF li_sqlcode1 <> 0 THEN
				EXIT
			END IF
			
			ll_processctr = ll_processctr + 1
			lstr_lspcurrent = lstr_lspcurrentnull
		
			lstr_lspcurrent.icdrcd   = lstr_currledge.focode
			lstr_lspcurrent.iacttype = lstr_currledge.lspacctype
			lstr_lspcurrent.inortype = lstr_currledge.lsportype
			lstr_lspcurrent.iactcd   = lstr_currledge.acctcode
			ls_tempamount   = STRING(lstr_currledge.amount,"00000000000000.00")
	      ls_decimaltrim = MID(ls_tempamount,16)
   	   ls_wholetrim   = MID(ls_tempamount,4,11)
	      ls_tempamount    = TRIM(ls_wholetrim) + TRIM(ls_decimaltrim)

			lstr_lspcurrent.inpamt   = ls_tempamount
			lstr_lspcurrent.indate   = STRING(lstr_currledge.refdate,'mm/dd/yyyy')
			lstr_lspcurrent.inpsrc   = lstr_currledge.paytype
			lstr_lspcurrent.inpent   = '' 
			lstr_lspcurrent.inpstp   = lstr_currledge.sourcetype
			lstr_lspcurrent.inprdate = STRING(lstr_currledge.refdate,'mmddyyyy')
			lstr_lspcurrent.compcode = lstr_currledge.cocode
			lstr_lspcurrent.procdte  = ls_procdte
			lstr_lspcurrent.userid   = ls_userid 
		   ll_grosscomm = 0
			
			CHOOSE CASE lstr_currledge.sourcetype
				CASE 'CD'
      	      lstr_currledge.refno = TRIM(lstr_currledge.refno)
					ll_rowcountlspaptransx = dw_lspuploadaptransx.rowcount()
					FOR ll_rowcurrentlspaptransx = 1 TO ll_rowcountlspaptransx
						IF TRIM( lstr_currledge.cocode ) = TRIM( dw_lspuploadaptransx.getitemstring( ll_rowcurrentlspaptransx, "compcode" ) ) AND &
						   TRIM( lstr_currledge.focode ) = TRIM( dw_lspuploadaptransx.getitemstring( ll_rowcurrentlspaptransx, "region" ) ) AND &
							TRIM(lstr_currledge.refno) = TRIM( dw_lspuploadaptransx.getitemstring( ll_rowcurrentlspaptransx, "docnum" ) ) THEN

							ls_docnum                = dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"docnum")
	 						ls_doctype               = dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"doctype")
										
							IF ls_doctype = 'CV' AND &
								LONG( dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"payor") ) = 0 THEN
								// Payor should contain the Commission Amount for CV.
								CONTINUE
							END IF
							
							lstr_lspcurrent.ipolno   = dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"refdoc")
							lstr_lspcurrent.inpln    = dw_lspuploadaptransx.getitemstring(ll_rowcurrentlspaptransx,"payor")
					 
							EXIT 
						END IF	
					END FOR
				
					IF ISNULL(lstr_lspcurrent.ipolno) THEN 
						lstr_lspcurrent.ipolno = '          '
					END IF
					IF ISNULL(lstr_lspcurrent.inpln) THEN
						lstr_lspcurrent.inpln = '               '
					END IF
					IF ISNULL(ls_docnum) THEN
						ls_docnum = '       '
					END IF
					IF TRIM(ls_doctype) = 'CV' THEN
						lstr_lspcurrent.inorno   = ' '
//						lstr_lspcurrent.inpln = RIGHT( lstr_lspcurrent.inpln, 15 )  // Gross Commission
						ll_grosscomm = LONG( RIGHT( lstr_lspcurrent.inpln, 15 ) ) / 100
					END IF
					IF TRIM(ls_doctype) = 'OR' THEN
						lstr_lspcurrent.inorno   = ls_docnum
					END IF
					lstr_lspcurrent.inpfn    = ''
					lstr_lspcurrent.inpmi    = ''
					
//					IF lstr_currledge.amount < -.001 THEN
//						lstr_lspcurrent.inpsgn   = '*'
//					ELSE
//						lstr_lspcurrent.inpsgn   = ' '
//					END IF
//				
					lstr_lspcurrent.iagtcd   = '      '
					
					IF TRIM(ls_doctype) = 'CV' THEN
						lstr_lspcurrent.incvno = ls_docnum
						lstr_lspcurrent.iagtcd = lstr_lspcurrent.ipolno  // For CV, ipolno contains the Agent Code 
						lstr_lspcurrent.ipolno = '          '
					END IF
				
					IF TRIM(ls_doctype) = 'OR' THEN
						lstr_lspcurrent.incvno = '          '
					END IF
					lstr_lspcurrent.inckno   = '      '
         	   IF lstr_currledge.paytype = 'C' THEN
						lstr_lspcurrent.inpclrdt = '00000000'
					END IF
					IF lstr_currledge.paytype = 'Q' THEN
						lstr_lspcurrent.inpclrdt = STRING(RelativeDate(lstr_currledge.refdate, 5),'mmddyyyy') 
					END IF
				CASE 'FO'
			   	lstr_currledge.refno     = TRIM(lstr_currledge.refno)
					lstr_currledge.controlno = TRIM(lstr_currledge.controlno) 
					ll_rowcountlsporitemcurrx = dw_lspuploadoritemcurrx.rowcount()

					FOR ll_rowcurrentlsporitemcurrx = 1 TO ll_rowcountlsporitemcurrx
						IF TRIM( lstr_currledge.cocode ) <> TRIM( dw_lspuploadoritemcurrx.getitemstring( ll_rowcurrentlsporitemcurrx, "compcode" ) ) AND &
							TRIM( lstr_currledge.focode ) <> TRIM( dw_lspuploadoritemcurrx.getitemstring( ll_rowcurrentlsporitemcurrx, "focode" ) ) THEN
							CONTINUE
						END IF
						
						ls_orno=TRIM(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"orno"))
						ls_polno=TRIM(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"polno"))
						ls_entno = TRIM(dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"entno"))
						ldt_ssidate = dw_lspuploadoritemcurrx.getitemdate(ll_rowcurrentlsporitemcurrx,"oritemdtlcurrx_ssiyrmm")
					
						IF (TRIM(lstr_currledge.refno)=ls_orno) or (TRIM(lstr_currledge.refno) = ls_polno) THEN
							if ls_entno <> '' AND NOT ISNULL( ls_entno ) THEN
								lstr_lspcurrent.ipolno = ls_entno
							
								IF LEFT( ls_entno, 1 ) = 'G' OR LEFT( ls_entno, 1 ) = 'S' THEN
									lstr_lspcurrent.ipolno = LEFT( ls_entno, 1 ) + RIGHT( ls_entno, 5 ) + &
									   STRING( ldt_ssidate, 'YYMM' )
								ELSE
									// Assumption is that all Group ICBI has a T1 code
									lstr_lspcurrent.ipolno   = MID( ls_orno,4 )
								END IF
								
								IF TRIM( lstr_currledge.acctcode ) = '375008' THEN  // New Business Account
									lstr_lspcurrent.ipolno   = MID( ls_orno,4 )
								END IF
							elseif ls_polno='' then
								IF TRIM( dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"applno") ) <> '' THEN
									lstr_lspcurrent.ipolno = 'A' + TRIM( dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"applno") )
								ELSE
									lstr_lspcurrent.ipolno   = MID( ls_orno,4 )
								END IF
							else
						   	lstr_lspcurrent.ipolno   = ls_polno
							end if	
							lstr_lspcurrent.inpln    = dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"clientname")
							lstr_lspcurrent.inpfn    = dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"clientname")
							lstr_lspcurrent.inpmi    = dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"clientname")
							lstr_lspcurrent.inorno   = dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"orno")
							lstr_lspcurrent.iagtcd   = dw_lspuploadoritemcurrx.getitemstring(ll_rowcurrentlsporitemcurrx,"agtno")
							EXIT 
						END IF	
					END FOR
				
					IF ISNULL(lstr_lspcurrent.ipolno) THEN 
						lstr_lspcurrent.ipolno = '          '
					END IF
					IF ISNULL(lstr_lspcurrent.inpln) THEN
						lstr_lspcurrent.inpln = '               '
					END IF
					IF ISNULL(lstr_lspcurrent.inpfn) THEN
						lstr_lspcurrent.inpfn = ' '
					END IF
					IF ISNULL(lstr_lspcurrent.inpmi) THEN
						lstr_lspcurrent.inpmi = ' '
					END IF
					
//					IF lstr_currledge.amount < -.001 THEN
//						lstr_lspcurrent.inpsgn   = '*'
//					ELSE
//						lstr_lspcurrent.inpsgn   = ' '
//					END IF

					lstr_lspcurrent.incvno   = '          '
					lstr_lspcurrent.inckno   = '      '
					
   	         IF TRIM(lstr_currledge.paytype) = 'C' THEN
						iF lstr_currledge.origcy ='PHP' THEN
							lstr_lspcurrent.inpclrdt = '00000000'
						ELSE
							lstr_lspcurrent.inpclrdt = STRING(wf_clearing(lstr_currledge.refdate,'N'),'yyyymmdd')
						END IF	
					END IF
			
			
					IF TRIM(lstr_currledge.paytype) = 'Q' THEN
						
						lstr_lspcurrent.inpclrdt = STRING(RelativeDate(lstr_currledge.refdate, 5),'yyyymmdd') 
					END IF
				CASE 'FC'
					lstr_currledge.refno     = TRIM(lstr_currledge.refno)
					lstr_currledge.controlno = TRIM(lstr_currledge.controlno) 
					ll_rowcountlspdisitemcurrx = dw_lspuploaddisitemcurrx.rowcount()
					
					FOR ll_rowcurrentlspdisitemcurrx = 1 TO ll_rowcountlspdisitemcurrx
						IF TRIM( lstr_currledge.cocode ) = TRIM( dw_lspuploaddisitemcurrx.getitemstring( ll_rowcurrentlspdisitemcurrx, "compcode" ) ) AND &
							TRIM( lstr_currledge.focode ) = TRIM( dw_lspuploaddisitemcurrx.getitemstring( ll_rowcurrentlspdisitemcurrx, "focode" ) ) AND &
						   TRIM( lstr_currledge.refno) = TRIM( dw_lspuploaddisitemcurrx.getitemstring( ll_rowcurrentlspdisitemcurrx, "disno" ) ) THEN
						
							lstr_lspcurrent.ipolno   = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"polno")
							lstr_lspcurrent.inpln    = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"clientname")
							lstr_lspcurrent.inpfn    = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"clientname")
							lstr_lspcurrent.inpmi    = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"clientname")
							lstr_lspcurrent.incvno   = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"disno")
							lstr_lspcurrent.inckno   = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"checkno")
							lstr_lspcurrent.iagtcd   = dw_lspuploaddisitemcurrx.getitemstring(ll_rowcurrentlspdisitemcurrx,"agtno")
							ll_grosscomm 				 = dw_lspuploaddisitemcurrx.getitemdecimal(ll_rowcurrentlspdisitemcurrx,"disamt")
							EXIT 
						END IF	
					END FOR
					IF ISNULL(lstr_lspcurrent.ipolno) THEN 
						lstr_lspcurrent.ipolno = '          '
					END IF
					IF ISNULL(lstr_lspcurrent.inpln) THEN
						lstr_lspcurrent.inpln = '               '
					END IF
					IF ISNULL(lstr_lspcurrent.inpfn) THEN
						lstr_lspcurrent.inpfn = ' '
					END IF
					IF ISNULL(lstr_lspcurrent.inpmi) THEN
						lstr_lspcurrent.inpmi = ' '
					END IF
					
//					IF lstr_currledge.amount < -.001 THEN
//						lstr_lspcurrent.inpsgn   = '*'
//					ELSE
//						lstr_lspcurrent.inpsgn   = ' '
//					END IF
					
					lstr_lspcurrent.inorno   = '       '
	            IF TRIM(lstr_currledge.paytype) = 'C' THEN
						lstr_lspcurrent.inpclrdt = '00000000'
					END IF
					IF TRIM(lstr_currledge.paytype) = 'Q' THEN
						lstr_lspcurrent.inpclrdt = STRING(RelativeDate(lstr_currledge.refdate, 5),'mmddyyyy') 
					END IF
			END CHOOSE
			ls_lspcurrent = ''
			ls_lspcurrent = STRING(lstr_lspcurrent.compcode, "@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.icdrcd, "@@@")
			
			// NB Business Application No.
			
//			IF TRIM( lstr_lspcurrent.iactcd ) = '375008' OR ( lstr_lspcurrent.iacttype = 'C' AND &
//			   lstr_lspcurrent.inortype = '2' AND  TRIM( lstr_lspcurrent.iactcd )  = '100007' ) OR &
//				( lstr_lspcurrent.iacttype = 'R' AND &
//			   lstr_lspcurrent.inortype = '1' AND  TRIM( lstr_lspcurrent.iactcd )  = '375040' ) THEN
//				lstr_lspcurrent.ipolno = 'A' + LEFT( TRIM( lstr_lspcurrent.ipolno ), 9 )
//			END IF
			
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.ipolno,   "@@@@@@@@@@")
   	   ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpln,    "@@@@@@@@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpfn,    "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpmi,    "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.iacttype, "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inortype, "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.iactcd,   "@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(ls_inpsgn,   "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpamt,   "@@@@@@@@@@@@@")
//			ls_iornum = MID(lstr_lspcurrent.inorno,4)
			ls_iornum = TRIM( lstr_lspcurrent.inorno )
			ls_lspcurrent = ls_lspcurrent + STRING(ls_iornum,   "@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(DATE(lstr_lspcurrent.indate), "yyyymmdd")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpsrc,   "@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpent,   "@@@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inpstp,   "@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.iagtcd,   "@@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.incvno,   "@@@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inckno,   "@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(lstr_lspcurrent.inprdate, "@@@@@@@@")
			ls_lspcurrent = ls_lspcurrent + STRING(DATE(lstr_lspcurrent.inpclrdt),"mmddyyyy")
			
			IF li_ctr_proc = 1 THEN
				FILEWRITE(li_FileNumapln,ls_lspcurrent)
			ELSEIF li_ctr_proc = 2 THEN 
				FILEWRITE(li_FileNumalai,ls_lspcurrent)
			END IF
			
			IF TRIM( lstr_currledge.origcy ) = 'USD' THEN
				lstr_lspcurrent.compcode = 'ALDC'
			END IF
		
			ls_icomp    = STRING(lstr_lspcurrent.compcode, "@@@@")
			ls_icdrcd   = STRING(lstr_lspcurrent.icdrcd, "@@@")
			
			ls_ipolno   = f_padleftspace( TRIM( lstr_lspcurrent.ipolno ), 10 ) 
			ls_ipolno   = STRING(ls_ipolno,   "@@@@@@@@@@")
			
			ls_inpln    = STRING(lstr_lspcurrent.inpln,    "@@@@@@@@@@@@@@@")
			ls_inpfn    = STRING(lstr_lspcurrent.inpfn,    "@")
			ls_inpmi    = STRING(lstr_lspcurrent.inpmi,    "@")
			ls_inpact   = STRING(lstr_lspcurrent.iacttype, "@")
			ls_inpopt   = STRING(lstr_lspcurrent.inortype, "@")
			IF LEN(lstr_lspcurrent.iactcd) <> 0 THEN
			   ll_iactcd = LONG(lstr_lspcurrent.iactcd)
			END IF
//			ls_inpsgn   = STRING(ls_inpsgn,   "@")

			ldec_inpamt = DEC(STRING(lstr_currledge.amount,"00000000000000.00"))
			
//			IF LEN(lstr_lspcurrent.inorno) <> 0 THEN
// 			   ls_iornum   = MID(lstr_lspcurrent.inorno,4)
//			END IF
			
			ls_iornum   = TRIM( lstr_lspcurrent.inorno )
			
			li_iordtc   = INTEGER(MID(lstr_lspcurrent.indate,7,2))
			li_iordty   = INTEGER(MID(lstr_lspcurrent.indate,9,2))
			li_iordtm   = INTEGER(MID(lstr_lspcurrent.indate,1,2))
			li_iordtd   = INTEGER(MID(lstr_lspcurrent.indate,4,2))
			ls_inpsrc   = STRING(lstr_lspcurrent.inpsrc,   "@")
			ls_inpent   = STRING(lstr_lspcurrent.inpent,   "@@@@@@@@@@")
			ls_inpstp   = STRING(lstr_lspcurrent.inpstp,   "@@")
			ls_iagtcd   = STRING(lstr_lspcurrent.iagtcd,   "@@@@@@@@@")
			ls_incvno   = TRIM( STRING(lstr_lspcurrent.incvno,   "@@@-@@@@@@@") )
			if ls_incvno = '-' then ls_incvno = ''
			ls_inckno   = STRING(lstr_lspcurrent.inckno,   "@@@@@@")
			ls_inprdt	= STRING(today(),'yyyymmdd')
	      ls_iclrdt   = STRING(DATE(lstr_lspcurrent.inpclrdt),"MMDDYYYY")
			
			IF ISNULL( ls_inpsgn ) THEN
				ls_inpsgn = ''
			END IF
			
//			INSERT INTO "APMODDTA"."INTINPFL"  
//      	          ( "ICOMP","ICDRCD","IPOLNO","INPLN","INPFN","INPMI","INPACT",   
//         	         "INPOPT","IACTCD","INPSGN","INPAMT","IORNUM","IORDTC",   
//            	      "IORDTY","IORDTM","IORDTD","INPSRC","INPENT","INPSTP",   
//               	   "IAGTCD","INCVNO","INCKNO","INAMT1","ICLRDT")  
//		       VALUES   (:ls_icomp,:ls_icdrcd,:ls_ipolno,:ls_inpln,:ls_inpfn,:ls_inpmi,:ls_inpact,
//			    		  :ls_inpopt,:ll_iactcd,:ls_inpsgn,:ldec_inpamt,:ls_iornum,:li_iordtc,
//						  :li_iordty,:li_iordtm,:li_iordtd,:ls_inpsrc,:ls_inpent,:ls_inpstp,
//						  :ls_iagtcd,:ls_incvno,:ls_inckno,:ll_grosscomm,:ls_iclrdt) USING SQLCA_APMODDTA;
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
					MessageBox("SQL error", SQLCA_ALMODDATA.SQLErrText)
					ROLLBACK USING SQLCA_ALMODDATA;
					RETURN FALSE
				END IF
			END IF

			li_percent      = (ll_processctr / ll_nlsp_total ) * 100
		   st_percent.text = string(li_percent) + "%" + " Complete"
		   st_process.text = string(ll_processctr)
		   hpb_1.position  = li_percent 
		LOOP
		CLOSE c_currledge_nlsp1 ;
	LOOP
	
	IF li_ctr_proc = 1 THEN
		FILECLOSE(li_fileNumapln)
	END IF
	
	IF li_ctr_proc = 2 THEN
		FILECLOSE(li_fileNumalai)
	END IF
	
	CLOSE c_nlsp1 ;
NEXT

RETURN TRUE
end function

public function date wf_clearing (date dstart, character clrtype);integer bankdays
bankdays=0
integer clrdays
setnull(clrdays)
  SELECT "SYRCHKCLR"."CLEARDAYS"  
    INTO :clrdays  
    FROM "SYRCHKCLR"  
   WHERE "SYRCHKCLR"."CLEARTYPE" = :clrtype;
	
if isnull(clrtype) then return RelativeDate(dstart,28)

DO WHILE bankdays < clrdays
	dstart=RelativeDate (dstart,1)
	if DayNumber(dstart)=7 or DayNumber(dstart)=1 then
	elseif f_holiday(dstart) then
	else
		bankdays=bankdays+1
	end if	
LOOP
return dstart
end function
on w_lspupload.create
this.dw_lspuploadbrstrans=create dw_lspuploadbrstrans
this.dw_cheques=create dw_cheques
this.dw_lspuploadgrptrans=create dw_lspuploadgrptrans
this.dw_lspuploadbpytrans=create dw_lspuploadbpytrans
this.dw_lspuploaddisitemcurrx=create dw_lspuploaddisitemcurrx
this.dw_lspuploadoritemcurrx=create dw_lspuploadoritemcurrx
this.cb_2=create cb_2
this.cb_1=create cb_1
this.p_1=create p_1
this.st_read=create st_read
this.st_2=create st_2
this.st_1=create st_1
this.st_process=create st_process
this.st_percent=create st_percent
this.hpb_1=create hpb_1
this.gb_1=create gb_1
this.dw_lspuploadaptransx=create dw_lspuploadaptransx
this.dw_jro=create dw_jro
this.timing_1=create timing_1
this.Control[]={this.dw_lspuploadbrstrans,&
this.dw_cheques,&
this.dw_lspuploadgrptrans,&
this.dw_lspuploadbpytrans,&
this.dw_lspuploaddisitemcurrx,&
this.dw_lspuploadoritemcurrx,&
this.cb_2,&
this.cb_1,&
this.p_1,&
this.st_read,&
this.st_2,&
this.st_1,&
this.st_process,&
this.st_percent,&
this.hpb_1,&
this.gb_1,&
this.dw_lspuploadaptransx,&
this.dw_jro}
end on

on w_lspupload.destroy
destroy(this.dw_lspuploadbrstrans)
destroy(this.dw_cheques)
destroy(this.dw_lspuploadgrptrans)
destroy(this.dw_lspuploadbpytrans)
destroy(this.dw_lspuploaddisitemcurrx)
destroy(this.dw_lspuploadoritemcurrx)
destroy(this.cb_2)
destroy(this.cb_1)
destroy(this.p_1)
destroy(this.st_read)
destroy(this.st_2)
destroy(this.st_1)
destroy(this.st_process)
destroy(this.st_percent)
destroy(this.hpb_1)
destroy(this.gb_1)
destroy(this.dw_lspuploadaptransx)
destroy(this.dw_jro)
destroy(this.timing_1)
end on

event open;string ls_inifile,ls_dbms, ls_database, ls_userid, ls_dbpass, ls_logid, ls_logpass, ls_server, ls_dbparm, ls_lock, ls_autocommit

end event

type dw_lspuploadbrstrans from datawindow within w_lspupload
boolean visible = false
integer y = 580
integer width = 507
integer height = 92
integer taborder = 30
boolean titlebar = true
string title = "d_lspuploadbrstrans"
string dataobject = "d_lspuploadbrstrans"
boolean livescroll = true
end type

type dw_cheques from datawindow within w_lspupload
boolean visible = false
integer x = 1568
integer y = 448
integer width = 366
integer height = 100
integer taborder = 30
boolean titlebar = true
string title = "d_cheques"
string dataobject = "d_cheques"
boolean livescroll = true
borderstyle borderstyle = stylelowered!
end type

type dw_lspuploadgrptrans from datawindow within w_lspupload
boolean visible = false
integer y = 580
integer width = 507
integer height = 92
integer taborder = 40
boolean titlebar = true
string title = "d_lspuploadgrptrans"
string dataobject = "d_lspuploadgrptrans"
boolean livescroll = true
end type

type dw_lspuploadbpytrans from datawindow within w_lspupload
boolean visible = false
integer y = 472
integer width = 507
integer height = 92
integer taborder = 20
boolean titlebar = true
string title = "d_lspuploadbpytrans"
string dataobject = "d_lspuploadbpytrans"
boolean livescroll = true
end type

type dw_lspuploaddisitemcurrx from datawindow within w_lspupload
boolean visible = false
integer y = 364
integer width = 507
integer height = 92
integer taborder = 30
boolean titlebar = true
string title = "d_lspuploaddisitemcurrx"
string dataobject = "d_lspuploaddisitemcurrx"
boolean livescroll = true
end type

type dw_lspuploadoritemcurrx from datawindow within w_lspupload
boolean visible = false
integer y = 100
integer width = 507
integer height = 100
integer taborder = 20
boolean titlebar = true
string title = "d_lspuploadoritemcurrx"
string dataobject = "d_lspuploadoritemcurrx"
boolean livescroll = true
end type

type cb_2 from commandbutton within w_lspupload
integer x = 1216
integer y = 444
integer width = 343
integer height = 100
integer taborder = 30
integer textsize = -8
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Close"
end type

event clicked;CLOSE(w_lspupload)
end event

type cb_1 from commandbutton within w_lspupload
integer x = 827
integer y = 444
integer width = 343
integer height = 100
integer taborder = 20
integer textsize = -8
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Start"
boolean cancel = true
end type

event clicked;si_second = 0
si_minute = 0 
si_hour   = 0 
//Timer(1,w_lspupload)

w_lspupload.postevent("ue_lspupload")
end event

type p_1 from picture within w_lspupload
integer x = 9
integer y = 28
integer width = 434
integer height = 528
string picturename = "\CAC Entrp\icons&bmps\unload.bmp"
boolean focusrectangle = false
end type

type st_read from statictext within w_lspupload
integer x = 1312
integer y = 260
integer width = 165
integer height = 64
boolean bringtotop = true
integer textsize = -8
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "0"
boolean focusrectangle = false
end type

type st_2 from statictext within w_lspupload
integer x = 974
integer y = 256
integer width = 265
integer height = 64
boolean bringtotop = true
integer textsize = -8
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "Rows read:"
boolean focusrectangle = false
end type

type st_1 from statictext within w_lspupload
integer x = 974
integer y = 316
integer width = 329
integer height = 64
boolean bringtotop = true
integer textsize = -8
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "Rows written:"
boolean focusrectangle = false
end type

type st_process from statictext within w_lspupload
integer x = 1312
integer y = 316
integer width = 165
integer height = 64
boolean bringtotop = true
integer textsize = -8
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "0"
boolean focusrectangle = false
end type

type st_percent from statictext within w_lspupload
integer x = 549
integer y = 160
integer width = 1248
integer height = 64
boolean bringtotop = true
integer textsize = -8
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "0 % Complete"
alignment alignment = center!
boolean focusrectangle = false
end type

type hpb_1 from hprogressbar within w_lspupload
integer x = 544
integer y = 92
integer width = 1253
integer height = 56
boolean bringtotop = true
unsignedinteger maxposition = 100
integer setstep = 1
end type

type gb_1 from groupbox within w_lspupload
integer x = 485
integer y = 28
integer width = 1367
integer height = 384
integer taborder = 10
integer textsize = -8
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
borderstyle borderstyle = stylelowered!
end type

type dw_lspuploadaptransx from datawindow within w_lspupload
boolean visible = false
integer y = 232
integer width = 507
integer height = 104
integer taborder = 10
boolean bringtotop = true
boolean titlebar = true
string title = "d_lspuploadaptrans"
string dataobject = "d_lspuploadaptransx"
boolean livescroll = true
end type

type dw_jro from datawindow within w_lspupload
boolean visible = false
integer x = 521
integer y = 508
integer width = 389
integer height = 100
integer taborder = 20
boolean bringtotop = true
boolean titlebar = true
string title = "Homeservice"
string dataobject = "d_homeservice_jro"
boolean hscrollbar = true
boolean vscrollbar = true
boolean livescroll = true
borderstyle borderstyle = stylelowered!
end type

type timing_1 from timing within w_lspupload descriptor "pb_nvo" = "true" 
end type

on timing_1.create
call super::create
TriggerEvent( this, "constructor" )
end on

on timing_1.destroy
TriggerEvent( this, "destructor" )
call super::destroy
end on

