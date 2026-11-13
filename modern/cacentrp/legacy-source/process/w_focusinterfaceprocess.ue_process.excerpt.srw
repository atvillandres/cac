event ue_process;LONG    ll_rowcount, ll_rowcurrent
STRING  ls_compcode,ls_focode,ls_orno, ls_filename
DATE    ldte_filedate
BOOLEAN lb_return

ls_compcode   = TRIM( gstr_proccdrvar.compcode )
ls_focode     = TRIM( gstr_proccdrvar.focode )
ls_filename = TRIM( gstr_proccdrvar.filename )
ldte_filedate = f_filedate (ls_filename)

idec_totfocshclr = 0 
idec_php_totfocshclr = 0
idec_usd_totfocshclr = 0

idec_totbnk = 0
idec_usd_totbnk = 0
idec_php_totbnk = 0

// Get Dollar Booking Rate from table later...
idec_bkrate = gdec_bkrate

dw_disbcash.Settransobject(SQLCA)
dw_disbcheck.Settransobject(SQLCA)

dw_disbcashnet.Settransobject(SQLCA)
dw_disbchecknet.Settransobject(SQLCA)

dw_mapfocus.settransobject(SQLCA)
dw_ucurrledgefocus.settransobject(SQLCA)
dw_maporcashcurr.settransobject(SQLCA)
dw_maporcheckcurr.settransobject(SQLCA)
dw_maporitemdtlcurr.settransobject(SQLCA)
dw_maporunique.settransobject(SQLCA)

dw_dismapdischeck.settransobject(SQLCA)
dw_dismapchecknet.settransobject(SQLCA)

dw_disbmapdisded.settransobject(SQLCA)
dw_disbmapdisded_cash.settransobject(SQLCA)
dw_disbmapdisadd.settransobject(SQLCA)
dw_disbmapdisadd_cash.settransobject(SQLCA)

dw_disbmapcash.settransobject(SQLCA)
dw_disbmapcashnet.settransobject(SQLCA)

dw_fundtransferdebit.settransobject(SQLCA)
dw_fundtransfercredit.settransobject(SQLCA)
dw_dtldedunitcode.settransobject(SQLCA)
dw_dismapdischeck2.SetTransObject(SQLCA)
dw_dismapgetcheck2.SetTransObject(SQLCA)

dw_disitemdtlcurr_disno.SetTransObject(SQLCA)
dw_syrbank.SetTransObject(SQLCA)
dw_spcexcess.SetTransObject(SQLCA)

gstr_proccdrvar.batchfile = 'Error.bat'

dw_maporcashcurr.retrieve(ls_compcode,ls_focode)

dw_maporcheckcurr.retrieve(ls_compcode,ls_focode)

dw_maporitemdtlcurr.retrieve(ls_compcode,ls_focode)

dw_maporunique.retrieve(ls_compcode,ls_focode)

SELECT SYRCACPARAM.PARAMCHAR INTO :is_exacct
FROM   SYRCACPARAM  
WHERE (TRIM( SYRCACPARAM.COMPCODE ) = :ls_compcode) AND ( TRIM( SYRCACPARAM.PARAMTYPE ) = '101');

IF sqlca.sqlcode = 100 THEN
	MessageBox('Stop', 'Not found paramtype 101 for FO Excess Cash Account No', StopSign!, Ok!)
	CLOSE ( this )
	RETURN
END IF

is_exacct = TRIM( is_exacct )

IF f_chksqlca (sqlca.sqlcode) = TRUE THEN
	CLOSE ( this )
	RETURN
END IF

SELECT SYRCACPARAM.PARAMCHAR INTO :is_chacct
FROM   SYRCACPARAM  
WHERE  ( TRIM( SYRCACPARAM.COMPCODE ) = :ls_compcode) AND ( TRIM( SYRCACPARAM.PARAMTYPE ) = '102');

IF sqlca.sqlcode = 100 THEN
	MessageBox('Stop', 'Not found paramtype 102 for FO Cash Clearing Account No', StopSign!, Ok!)
	CLOSE ( this )
	RETURN
END IF

is_chacct = TRIM( is_chacct )

IF f_chksqlca (sqlca.sqlcode) = TRUE THEN
	CLOSE ( this )
	RETURN
END IF

SELECT SYRUNIT.UNIT
   INTO :is_transfo_unit
	FROM SYRUNIT 
   WHERE TRIM( SYRUNIT.COCODE ) = :ls_compcode AND
         TRIM( SYRUNIT.ROCODE ) = :ls_focode ;

IF sqlca.sqlcode = 100 THEN
	MessageBox('Stop', 'Not found Unit code for this FO', StopSign!, Ok!)
	CLOSE ( this )
	RETURN
END IF

is_transfo_unit = TRIM( is_transfo_unit )

IF f_chksqlca (sqlca.sqlcode) = TRUE THEN
	CLOSE ( this )
	RETURN
END IF

SELECT SYRCACPARAM.PARAMCHAR INTO :is_rgainlosscode
FROM   SYRCACPARAM  
WHERE (TRIM( SYRCACPARAM.COMPCODE ) = :ls_compcode) AND ( TRIM( SYRCACPARAM.PARAMTYPE ) = '106');

IF sqlca.sqlcode = 100 THEN
	MessageBox('Stop', 'Not found paramtype 106 for Realized Gain/Loss Account No', StopSign!, Ok!)
	CLOSE ( this )
	RETURN
END IF

is_rgainlosscode = TRIM( is_rgainlosscode )

IF f_chksqlca (sqlca.sqlcode) = TRUE THEN
	CLOSE ( this )
	RETURN
END IF

/*Routine for collection*/
cbx_collection.checked = TRUE 
lb_return = wf_processcollection(ls_compcode,ls_focode,ldte_filedate)
IF lb_return THEN /*if collection process return true (no error) proceed to disbursement*/
	cbx_disbursement.checked = TRUE
	lb_return = wf_processdisbursement(ls_compcode,ls_focode,ldte_filedate)
	
   IF lb_return THEN
		/*if disbursement return true no error - proceed to map deposit*/
		cbx_deposit.checked = TRUE
		lb_return = wf_processdeposit(ls_compcode,ls_focode,ldte_filedate)
		IF lb_return THEN
			/*Balance entries per source*/
			cbx_balance.checked = TRUE
			lb_return = wf_balentries(ls_compcode,ls_focode,ldte_filedate)
			IF lb_return THEN
			/*Create Entries*/
				lb_return = wf_processcomplete( 'L', ls_compcode, ls_focode )
				IF lb_return THEN
					COMMIT USING SQLCA;
					gstr_proccdrvar.batchfile = 'Success.bat'
				ELSE
					ROLLBACK USING SQLCA;
				END IF
			END IF
		END IF
	END IF
END IF

IF lb_return THEN
	COMMIT;
	gstr_proccdrvar.batchfile = 'Success.bat'
ELSE
	ROLLBACK;
END IF

CLOSE ( this )



end event
