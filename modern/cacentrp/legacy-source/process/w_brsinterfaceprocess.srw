forward
global type w_brsinterfaceprocess from window
end type
type dw_bdoapmst4brs from datawindow within w_brsinterfaceprocess
end type
type st_currentfile from statictext within w_brsinterfaceprocess
end type
type lb_brsfiles from listbox within w_brsinterfaceprocess
end type
type dw_brsfilex from datawindow within w_brsinterfaceprocess
end type
type dw_mapbrs from datawindow within w_brsinterfaceprocess
end type
type cb_close from commandbutton within w_brsinterfaceprocess
end type
type cb_start from commandbutton within w_brsinterfaceprocess
end type
type st_3 from statictext within w_brsinterfaceprocess
end type
type hpb_1 from hprogressbar within w_brsinterfaceprocess
end type
type st_process from statictext within w_brsinterfaceprocess
end type
type st_read from statictext within w_brsinterfaceprocess
end type
type st_1 from statictext within w_brsinterfaceprocess
end type
type p_1 from picture within w_brsinterfaceprocess
end type
type st_percent from statictext within w_brsinterfaceprocess
end type
end forward

global type w_brsinterfaceprocess from window
integer width = 1984
integer height = 756
boolean titlebar = true
string title = "BRS Interface Process"
boolean controlmenu = true
windowtype windowtype = response!
long backcolor = 67108864
event type boolean ue_openbrs ( )
dw_bdoapmst4brs dw_bdoapmst4brs
st_currentfile st_currentfile
lb_brsfiles lb_brsfiles
dw_brsfilex dw_brsfilex
dw_mapbrs dw_mapbrs
cb_close cb_close
cb_start cb_start
st_3 st_3
hpb_1 hpb_1
st_process st_process
st_read st_read
st_1 st_1
p_1 p_1
st_percent st_percent
end type
global w_brsinterfaceprocess w_brsinterfaceprocess

type variables

end variables

on w_brsinterfaceprocess.create
this.dw_bdoapmst4brs=create dw_bdoapmst4brs
this.st_currentfile=create st_currentfile
this.lb_brsfiles=create lb_brsfiles
this.dw_brsfilex=create dw_brsfilex
this.dw_mapbrs=create dw_mapbrs
this.cb_close=create cb_close
this.cb_start=create cb_start
this.st_3=create st_3
this.hpb_1=create hpb_1
this.st_process=create st_process
this.st_read=create st_read
this.st_1=create st_1
this.p_1=create p_1
this.st_percent=create st_percent
this.Control[]={this.dw_bdoapmst4brs,&
this.st_currentfile,&
this.lb_brsfiles,&
this.dw_brsfilex,&
this.dw_mapbrs,&
this.cb_close,&
this.cb_start,&
this.st_3,&
this.hpb_1,&
this.st_process,&
this.st_read,&
this.st_1,&
this.p_1,&
this.st_percent}
end on

on w_brsinterfaceprocess.destroy
destroy(this.dw_bdoapmst4brs)
destroy(this.st_currentfile)
destroy(this.lb_brsfiles)
destroy(this.dw_brsfilex)
destroy(this.dw_mapbrs)
destroy(this.cb_close)
destroy(this.cb_start)
destroy(this.st_3)
destroy(this.hpb_1)
destroy(this.st_process)
destroy(this.st_read)
destroy(this.st_1)
destroy(this.p_1)
destroy(this.st_percent)
end on

event open;dw_mapbrs.SetTransObject( SQLCA )
dw_brsfilex.SetTransObject( SQLCA )
dw_bdoapmst4brs.SetTransObject( SQLCA )
end event

type dw_bdoapmst4brs from datawindow within w_brsinterfaceprocess
boolean visible = false
integer x = 41
integer y = 552
integer width = 411
integer height = 96
integer taborder = 20
boolean titlebar = true
string title = "bdoapmst4brs"
string dataobject = "d_bdoapmst4brs"
boolean livescroll = true
borderstyle borderstyle = stylelowered!
end type

type st_currentfile from statictext within w_brsinterfaceprocess
integer x = 558
integer y = 44
integer width = 1339
integer height = 64
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 128
long backcolor = 67108864
boolean focusrectangle = false
end type

type lb_brsfiles from listbox within w_brsinterfaceprocess
boolean visible = false
integer x = 1810
integer y = 536
integer width = 151
integer height = 52
integer taborder = 10
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
borderstyle borderstyle = stylelowered!
end type

type dw_brsfilex from datawindow within w_brsinterfaceprocess
boolean visible = false
integer x = 1897
integer y = 916
integer width = 411
integer height = 432
integer taborder = 10
string title = "none"
string dataobject = "d_brsfilex"
boolean livescroll = true
borderstyle borderstyle = stylelowered!
end type

type dw_mapbrs from datawindow within w_brsinterfaceprocess
boolean visible = false
integer x = 1897
integer y = 468
integer width = 411
integer height = 432
integer taborder = 10
string title = "none"
string dataobject = "d_mapbrs"
boolean livescroll = true
borderstyle borderstyle = stylelowered!
end type

type cb_close from commandbutton within w_brsinterfaceprocess
integer x = 1280
integer y = 508
integer width = 411
integer height = 92
integer taborder = 30
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Close"
end type

event clicked;close (parent)
end event

type cb_start from commandbutton within w_brsinterfaceprocess
integer x = 763
integer y = 508
integer width = 411
integer height = 92
integer taborder = 20
integer textsize = -10
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
string text = "&Start"
end type

event clicked;STRING ls_rectype, ls_cocode, ls_focode, ls_refno, ls_refdate, ls_sourcetype, ls_acctcode
STRING ls_drcr, ls_unit, ls_origcy, ls_loccy, ls_lob, ls_processdate
STRING ls_recdest, ls_controlno, ls_lspaccttype, ls_lsportype, ls_effectdate, ls_userid
STRING ls_paytype, ls_platid, ls_clnme, ls_clientname, ls_agentcode, ls_polno
STRING ls_brsfilename, ls_shortbrsfilename, ls_alaibankacct, ls_aldcbankacct 
DATE   ldt_refdate, ldt_processdate, ldt_effectdate, ldt_filedate
DEC {2} ldec_amount
DEC {2} ldec_alaictrlamt, ldec_aldcctrlamt, ldec_alaidtlamt, ldec_aldcdtlamt
INTEGER li_alaictrlrec, li_aldcctrlrec, li_alaidtlrec, li_aldcdtlrec
BOOLEAN lb_success


LONG   ll_insertrow, li_chkclrno
INTEGER li_itemno, li_ctrlctr, li_totalitems, li_current, li_result

LONG   ll_read, ll_processctr
STRING ls_linerec, ls_filectrl, ls_filedtl, ls_fileread, ls_run, ls_batchrun

INTEGER li_FileNum, li_csqlcode, li_percent
POINTER oldpointer

st_percent.text   = '0' + "%" + " Complete"
st_read.text      = '0'
st_process.text   = '0'
hpb_1.position    =  0

oldpointer = SetPointer(HourGlass!)

dw_mapbrs.Reset()
dw_brsfilex.Reset()
lb_brsfiles.Reset()

lb_brsfiles.DirList( "I:\BIS\*.ALI", 0 )

li_totalitems = lb_brsfiles.TotalItems( )

IF li_totalitems <= 0 THEN
	MessageBox ( "Note", "No BRS Files to process or Drive I not correctly mapped!", Information! )
	RETURN
END IF

FOR li_current = 1 TO li_totalitems
	ls_filedtl  =  'I:\BIS\' + lb_brsfiles.Text( li_current )
	st_currentfile.Text = 'Current Processing: ' + lb_brsfiles.Text( li_current )
	ldec_alaictrlamt = 0
	li_alaictrlrec = 0
	ldec_aldcctrlamt = 0
	li_aldcctrlrec = 0
	ldec_alaidtlamt = 0
	li_alaidtlrec = 0
	ldec_aldcdtlamt = 0
	li_aldcdtlrec = 0
	ll_read = 0
	ll_processctr = 0
	
	ls_brsfilename = TRIM( lb_brsfiles.Text( li_current ) )
	ls_shortbrsfilename = MID( ls_brsfilename, 1, POS( ls_brsfilename, "." ) - 1 )
	dw_bdoapmst4brs.Retrieve( ls_shortbrsfilename )
	
	IF dw_bdoapmst4brs.RowCount() > 0 THEN
		ldt_processdate = dw_bdoapmst4brs.GetItemDate( 1, "bdoprocdte" )		
		Messagebox( "Duplicate File", "File has already been processed on " + STRING( ldt_processdate, 'Mmm dd, yyyy' ), StopSign!, Ok!)
		CONTINUE
	END IF
	
	ldt_filedate = f_filedate( TRIM( ls_shortbrsfilename ) )
	li_FileNum = FileOpen( ls_filedtl , LineMode!, Read!, LockRead! )
	
	DO WHILE FileRead( li_FileNum, ls_fileread ) > 0
		Yield ()
		
		ls_rectype = LEFT( ls_fileread, 1 )
		
		IF ls_rectype = '1' THEN     // Control Record
			IF Mid( ls_fileread, 2, 4 ) = 'ALAI' THEN
				ldec_alaictrlamt = DEC( TRIM( Mid( ls_fileread, 14, 16 ) ) ) / 100
				li_alaictrlrec = INTEGER( Mid( ls_fileread, 30, 10 ) )
			ELSEIF Mid( ls_fileread, 2, 4 ) = 'ALDC' THEN
				ldec_aldcctrlamt = DEC( TRIM( Mid( ls_fileread, 14, 16 ) ) ) / 100
				li_aldcctrlrec = INTEGER( Mid( ls_fileread, 30, 10 ) )			
			END IF
		ELSEIF ls_rectype = '2' THEN     // Detail Record
			IF Mid( ls_fileread, 2, 4 ) = 'ALAI' THEN
				ldec_alaidtlamt += Dec( TRIM( Mid( ls_fileread, 61, 14 ) ) ) / 100
				li_alaidtlrec ++
			ELSEIF Mid( ls_fileread, 2, 4 ) = 'ALDC' THEN
				ldec_aldcdtlamt += Dec( TRIM( Mid( ls_fileread, 61, 14 ) ) ) / 100
				li_aldcdtlrec ++
			END IF
		ELSE
			CONTINUE
		END IF
		
		ll_read ++
	LOOP
	
	FileClose( li_FileNum )
	
	ll_read = nullintegertozero( ll_read )
	st_read.text = string( ll_read )
	st_percent.text = "0% Complete"
	
  	SELECT "ALAICAC"."SYRCACPARAM"."PARAMCHAR"  
   	INTO :ls_alaibankacct  
	   FROM "ALAICAC"."SYRCACPARAM"  
   	WHERE ( "ALAICAC"."SYRCACPARAM"."COMPCODE" = 'ALAI' ) AND  
      	   ( "ALAICAC"."SYRCACPARAM"."PARAMTYPE" = 'BI1' )   ;
				
	IF SQLCA.SQLCODE <> 0 OR TRIM( ls_alaibankacct ) = '' OR ISNULL( ls_alaibankacct ) THEN
		Messagebox( "Parameter Not Found: BI1", "BIS Bank Account Number is missing (ALAI)!", StopSign!, Ok!)
		SetPointer(oldpointer)
		CONTINUE	
	END IF

  	SELECT "ALAICAC"."SYRCACPARAM"."PARAMCHAR"  
   	INTO :ls_aldcbankacct  
	   FROM "ALAICAC"."SYRCACPARAM"  
   	WHERE ( "ALAICAC"."SYRCACPARAM"."COMPCODE" = 'ALDC' ) AND  
      	   ( "ALAICAC"."SYRCACPARAM"."PARAMTYPE" = 'BI1' )   ;
				
	IF SQLCA.SQLCODE <> 0 OR TRIM( ls_aldcbankacct ) = '' OR ISNULL( ls_aldcbankacct ) THEN
		Messagebox( "Paramter Not Found: BI1", "BIS Bank Account Number is missing (ALDC)!", StopSign!, Ok!)
		SetPointer(oldpointer)
		CONTINUE
	END IF
	
	ldec_alaidtlamt = (INTEGER( MID( ls_alaibankacct, 9, 2 ) ) * ldec_alaidtlamt) + (INTEGER( MID( ls_alaibankacct, 15, 2 ) ) * ldec_alaidtlamt)
	ldec_aldcdtlamt = (INTEGER( MID( ls_aldcbankacct, 9, 2 ) ) * ldec_aldcdtlamt) + (INTEGER( MID( ls_aldcbankacct, 15, 2 ) ) * ldec_aldcdtlamt)
	
	IF ldec_alaictrlamt <> ldec_alaidtlamt THEN
		Messagebox( "Error Found", "Mismatched Control vs Detail Amount (ALAI)", StopSign!, Ok!)
		SetPointer(oldpointer)
		Continue
	END IF
	
	IF ldec_aldcctrlamt <> ldec_aldcdtlamt THEN
		Messagebox( "Error Found", "Mismatched Control vs Detail Amount (ALDC)", StopSign!, Ok!)
		SetPointer(oldpointer)
		Continue
	END IF
	
	IF li_alaictrlrec <> li_alaidtlrec THEN
		Messagebox( "Error Found", "Mismatched Control vs Detail Record Count (ALAI)", StopSign!, Ok!)
		SetPointer(oldpointer)
		Continue
	END IF
	
	IF li_aldcctrlrec <> li_aldcdtlrec THEN
		Messagebox( "Error Found", "Mismatched Control vs Detail Record Count (ALDC)", StopSign!, Ok!)
		SetPointer(oldpointer)
		continue
	END IF
	
	IF li_alaidtlrec = 0 AND li_aldcdtlrec = 0 THEN
		MessageBox('Stop', 'No record(s) to process .....', StopSign!, Ok!)
		SetPointer(oldpointer)
		continue
	END IF
	
	lb_success = FALSE
	li_FileNum = FileOpen( ls_filedtl , LineMode!, Read!, LockRead! )
	
	DO WHILE FileRead( li_FileNum, ls_fileread ) > 0
		Yield ()
		lb_success = TRUE
		
		ls_rectype     = Left ( ls_fileread, 1 )
		
		IF ls_rectype = '1' THEN     // Control Record
			ll_processctr ++
			CONTINUE
		ELSEIF ASC( ls_rectype ) = 26 THEN
			CONTINUE
		END IF
		
		ls_cocode      = Mid( ls_fileread, 2, 4 )
		
		IF ls_cocode = 'ALDC' THEN
			ls_cocode = 'ALAI'
		END IF
		
		ls_focode      = TRIM( Mid( ls_fileread, 6, 3 ) )
		ls_refno       = TRIM( Mid( ls_fileread, 9, 20 ) )
		ldt_refdate     = DATE( string( Mid( ls_fileread, 29, 8 ), "@@@@-@@-@@" ) )
		ls_sourcetype  = TRIM( Mid( ls_fileread, 37, 2 ) )
		ls_acctcode    = TRIM( Mid( ls_fileread, 39, 20 ) )
		ls_drcr        = TRIM( Mid( ls_fileread, 59, 2 ) )
		ldec_amount      = Dec( TRIM( Mid( ls_fileread, 61, 14 ) ) ) / 100
		ls_unit        = TRIM( Mid( ls_fileread, 75, 7 ) )
		ls_origcy      = TRIM( Mid( ls_fileread, 82, 4 ) )
		ls_loccy       = TRIM( Mid( ls_fileread, 86, 4 ) )
		ls_lob         = TRIM( Mid( ls_fileread, 90, 4 ) )
		ldt_processdate = TODAY()
		li_itemno ++
		ls_recdest     = TRIM( Mid( ls_fileread, 104, 4 ) )
		ls_controlno   = TRIM( Mid( ls_fileread, 108, 10 ) )
		ls_lspaccttype = Mid( ls_fileread, 118, 1 )
		ls_lsportype   = Mid( ls_fileread, 119, 1 )
//		ldt_effectdate = DATE( string( Mid( ls_fileread, 120, 8 ), "@@@@-@@-@@" ) )
		ldt_effectdate = ldt_filedate
		ls_userid      = TRIM( Mid( ls_fileread, 128, 10 ) )
		ls_paytype     = TRIM( Mid( ls_fileread, 138, 4 ) )
		
		IF ldec_amount > 0 THEN
			// Write to CURRLEDGE
			ll_insertrow = dw_mapbrs.insertrow(0)
			dw_mapbrs.setitem( ll_insertrow, "cocode", ls_cocode)
			dw_mapbrs.setitem( ll_insertrow, "focode", ls_focode)
			dw_mapbrs.setitem( ll_insertrow, "refno", ls_refno)
			dw_mapbrs.setitem( ll_insertrow, "refdate", ldt_refdate )
			dw_mapbrs.setitem( ll_insertrow, "sourcetype", ls_sourcetype)
			dw_mapbrs.setitem( ll_insertrow, "acctcode", ls_acctcode)
			dw_mapbrs.setitem( ll_insertrow, "drcr", ls_drcr)
			dw_mapbrs.setitem(ll_insertrow, "amount", ldec_amount)
			dw_mapbrs.setitem( ll_insertrow, "lob", ls_lob)
			dw_mapbrs.setitem( ll_insertrow, "unit", ls_unit)
			dw_mapbrs.setitem( ll_insertrow, "origcy", ls_origcy)
			dw_mapbrs.setitem( ll_insertrow, "loccy", ls_loccy)
			dw_mapbrs.setitem( ll_insertrow, "processdate", ldt_processdate )
			dw_mapbrs.setitem( ll_insertrow, "itemno", li_itemno )
			dw_mapbrs.setitem( ll_insertrow, "recdest", ls_recdest)
			dw_mapbrs.setitem( ll_insertrow, "controlno", ls_controlno)
			dw_mapbrs.setitem( ll_insertrow, "lspacctype", ls_lspaccttype)
			dw_mapbrs.setitem( ll_insertrow, "lsportype", ls_lsportype)
			dw_mapbrs.setitem( ll_insertrow, "paytype", ls_paytype)
			dw_mapbrs.setitem( ll_insertrow, "effectdate", ldt_effectdate )
			dw_mapbrs.setitem( ll_insertrow, "userid", gs_userid)
			dw_mapbrs.setitem( ll_insertrow, "recctr", ll_insertrow )
			
			ls_clientname  = TRIM( Mid( ls_fileread, 149, 30 ) )
			ls_agentcode   = TRIM( Mid( ls_fileread, 179, 9 ) )
			ls_polno       = Mid( ls_fileread, 108, 10 )
			li_chkclrno    = INTEGER( TRIM( Mid( ls_fileread, 198, 9 ) ) )
			
			// Write to BRSFILEX
			
			ll_insertrow = dw_brsfilex.insertrow(0)
			dw_brsfilex.setitem( ll_insertrow, "cocode", ls_cocode)
			dw_brsfilex.setitem( ll_insertrow, "refno", ls_refno)
			dw_brsfilex.setitem( ll_insertrow, "refdate", ldt_refdate )
			dw_brsfilex.setitem( ll_insertrow, "itemno", li_itemno )
			dw_brsfilex.setitem( ll_insertrow, "clientname", ls_clientname)
			dw_brsfilex.setitem( ll_insertrow, "agentcode", ls_agentcode)
			dw_brsfilex.setitem( ll_insertrow, "polno", ls_polno)
			dw_brsfilex.setitem( ll_insertrow, "chkclrno", li_chkclrno )
			dw_brsfilex.setitem( ll_insertrow, "sourcefl", ls_shortbrsfilename )
			dw_brsfilex.setitem( ll_insertrow, "procdate", ldt_processdate )
		END IF
		
		// Display Info
		ll_processctr ++
		li_percent      = ( ll_processctr / ll_read ) * 100
		st_percent.text = string( li_percent ) + "%" + " Complete"
		st_process.text = string( ll_processctr )
		hpb_1.position  = li_percent 
	LOOP
	
	FileClose( li_FileNum )
	
	// Write to BDOAPMST

	ls_focode       = TRIM( Mid( ls_brsfilename, POS( ls_brsfilename, "." ) - 3, 3 ) )
	ldt_processdate = TODAY()
	
	dw_bdoapmst4brs.Reset()
	ll_insertrow = dw_bdoapmst4brs.insertrow(0)
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdoacompcd", ls_cocode )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdoacode", ls_focode )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdoasrce", '1' )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdoprocdte", ldt_processdate )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdoxnumf", 1 )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdoastatus", 'Y' )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdoasentdt", ldt_processdate )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdoarcvddt", ldt_processdate )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdomntdte", ldt_processdate )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdomntime", NOW() )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdouserid", gs_userid )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdosntcomp", ls_cocode ) 
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdonumfle", 1 )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdosubfile", ls_shortbrsfilename )
	dw_bdoapmst4brs.setitem( ll_insertrow, "bdosntbdo", ls_focode )
	dw_bdoapmst4brs.update()
	
	IF dw_mapbrs.update() = 1 THEN
		Messagebox( "Note", "BRSFILEX will be updated", Information!, Ok!)
		IF dw_brsfilex.update() = 1 THEN
			Messagebox( "Note", "BDOAPMST will be updated", Information!, Ok!)
			dw_bdoapmst4brs.setitem( ll_insertrow, "bdoastatus", 'L' )
			dw_bdoapmst4brs.update()
		ELSE
			lb_success = FALSE
		END IF
	ELSE
		lb_success = FALSE
	END IF
	
	IF lb_success THEN
		Messagebox( "Note", "File Successfully Uploaded", Information!, Ok!)
		ls_batchrun = "Success.bat"
	ELSE
		Messagebox( "Error in Updating", "Contact your System Admin!", Exclamation!, Ok!)
		ls_batchrun = "Error.bat"
	END IF

	// Copy input file to proper folder and delete it from source
	
	ls_run = "command.com /c C:\CACENT~~1\ALAI\DOSBAT\" + ls_batchrun + " " + ls_filedtl + " " + ls_brsfilename
	li_result = RUN( ls_run, Minimized!)

	IF li_result <> 1 THEN
		MessageBox( "Batch Run Error!", "Error in executing " + ls_batchrun + "!", Exclamation! )
	END IF
NEXT

SetPointer(oldpointer)

RETURN
end event

type st_3 from statictext within w_brsinterfaceprocess
integer x = 553
integer y = 404
integer width = 1106
integer height = 52
integer textsize = -8
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "Total number of record(s) processed in BIS File :"
boolean focusrectangle = false
end type

type hpb_1 from hprogressbar within w_brsinterfaceprocess
integer x = 553
integer y = 128
integer width = 1349
integer height = 64
unsignedinteger maxposition = 100
integer setstep = 10
boolean smoothscroll = true
end type

type st_process from statictext within w_brsinterfaceprocess
integer x = 1737
integer y = 404
integer width = 146
integer height = 56
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

type st_read from statictext within w_brsinterfaceprocess
integer x = 1737
integer y = 304
integer width = 146
integer height = 56
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

type st_1 from statictext within w_brsinterfaceprocess
integer x = 553
integer y = 300
integer width = 1157
integer height = 52
integer textsize = -8
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 33554432
long backcolor = 67108864
string text = "Total number of record(s) read in BIS File :"
boolean focusrectangle = false
end type

type p_1 from picture within w_brsinterfaceprocess
integer x = 32
integer y = 24
integer width = 498
integer height = 552
string picturename = "\CAC Entrp\icons&bmps\2drums.bmp"
boolean focusrectangle = false
end type

type st_percent from statictext within w_brsinterfaceprocess
integer x = 553
integer y = 212
integer width = 1339
integer height = 48
boolean bringtotop = true
integer textsize = -8
integer weight = 700
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Arial"
long textcolor = 16711680
long backcolor = 67108864
string text = "0% Complete"
alignment alignment = center!
end type

