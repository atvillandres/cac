event ue_createacctent;LONG 		     ll_counter,ll_row, ll_itemnoctr, ll_read, ll_count1, ll_count2, ll_count3, ll_rowcount, ll_processctr, ll_processctrdep 
STRING  	     ls_compcode, ls_focode, ls_memdocnum, ls_exacct, ls_chacct, ls_userid, ls_memtrantype, ls_memrefno, ls_filename, ls_buffamt
STRING        ls_spcunit, ls_numbersign, ls_printfile, ls_unitcd_xcash
INTEGER 	     li_percent, li_csqlcode
DATE          ld_trandate, ld_today  
DECIMAL{2}    ldec_cashdr, ldec_cashcr, ldec_diff , ldec_tempbal, ldec_cashbal
DECIMAL{2}    ldec_balcashcr,ldec_balcashdr, ldec_buffamt , ldec_cashbaldiff
DECIMAL{2}    ldec_tempbaldr, ldec_tempbalcr
DECIMAL{2}    ldec_totbnk, ldec_totfocshclr, ldec_excess_cash, ldec_cshclr, ldec_tot_excesscash
DECIMAL{2}    ldec_dwfocashclear, ldec_dwbankdep
STRING        ls_tmp
LONG 			  ll_found, ll_totalrow, ll_currentrow

dw_mapaptrans.settransobject(SQLCA);
dw_unbalcurrledge.settransobject(SQLCA);

STR_CURRLEDGE  lstr_currledge, lstr_currledgenull, lstr_bankcredit
STR_PROCCDRVAR lstr_procvar 

gstr_proccdrvar.batchfile = 'Error.bat'

DECLARE c_mapaptrans CURSOR FOR  
  SELECT APTRANS.COMPCODE,   
         APTRANS.REGION,   
         APTRANS.DOCNUM,   
         APTRANS.DOCDATE,   
         APTRANS.DOCTYPE,   
         ACCTENT.ACCTCODE,   
         ACCTENT.DRCR,   
         APTRANS.AMOUNT,   
         APTRANS.UNIT,   
         ACCTENT.ORIGCY,   
         ACCTENT.LOCCY,   
         ACCTENT.LOB,
         ACCTENT.RECDEST,   
         ACCTENT.CONTROLNO,   
         ACCTENT.LSPACCTYPE,   
         ACCTENT.LSPORTYPE,
			APTRANS.PAYTYPE,
			ACCTENT.TRANTYPE
	 FROM ACCTENT,   
         APTRANS  
   WHERE ( TRIM( APTRANS.COMPCODE ) = :ls_compcode ) and
	      ( TRIM( APTRANS.REGION )  = :ls_focode ) and 
			( TRIM(APTRANS.STATUS)  =  ''  OR APTRANS.STATUS IS NULL) and
	      ( APTRANS.COMPCODE = ACCTENT.COCODE ) and  
         ( APTRANS.ACCTTYPE = ACCTENT.TRANTYPE ) and 
         ( ACCTENT.PAYTYPE  = APTRANS.PAYTYPE  OR ACCTENT.PAYTYPE IS NULL OR TRIM(ACCTENT.PAYTYPE) = '')	
	ORDER BY APTRANS.COMPCODE,   
	         APTRANS.REGION,   
   	      APTRANS.DOCNUM,   
	         APTRANS.DOCDATE,   
	         ACCTENT.TRANTYPE;
				
 DECLARE c_mapapdeposit CURSOR FOR  
  SELECT ACCTENT.COCODE,   
         APDEPOSIT.BDOCODE,   
         '' AS DOCNUM,   
         APDEPOSIT.TRANDATE,   
         '' AS DOCTYPE,   
         ACCTENT.ACCTCODE,   
         ACCTENT.DRCR,   
         APDEPOSIT.AMOUNT,   
         ACCTENT.UNIT,   
         ACCTENT.ORIGCY,   
         ACCTENT.LOCCY,   
         ACCTENT.LOB,   
         ACCTENT.RECDEST,   
         ACCTENT.CONTROLNO  
    FROM ACCTENT,   
         APDEPOSIT  
   WHERE ( TRIM( APDEPOSIT.COMPCODE ) = :ls_compcode ) and
	      ( TRIM( APDEPOSIT.BDOCODE ) = :ls_focode ) and 
			( TRIM(APDEPOSIT.STATUS)  =  ''  OR APDEPOSIT.STATUS IS NULL) and
	      ( APDEPOSIT.COMPCODE = ACCTENT.COCODE ) AND
         ( APDEPOSIT.BANKACCT = ACCTENT.TRANTYPE ); 

 DECLARE c_mapfoexcess CURSOR FOR  
  SELECT '' AS COCODE,
         '' AS FOCODE,   
         '' AS DOCNUM,   
         '' AS DOCDATE,
         '' AS DOCTYPE,   
         ACCTENT.ACCTCODE,   
         ACCTENT.DRCR,   
         0.00 AS AMOUNT,   
         ACCTENT.UNIT,   
         ACCTENT.ORIGCY,   
         ACCTENT.LOCCY,   
         ACCTENT.LOB AS LOB,   
         ACCTENT.RECDEST,   
         ACCTENT.CONTROLNO,  
         ACCTENT.LSPACCTYPE,   
         ACCTENT.LSPORTYPE
    FROM ACCTENT
   WHERE ( TRIM( ACCTENT.COCODE ) = :ls_compcode ) and
        ( ACCTENT.ORIGCY = 'PHP') AND 
	      ( TRIM( ACCTENT.TRANTYPE ) = 'CACPAR01');
			
 DECLARE c_mapfoexcess_brs CURSOR FOR  
  SELECT '' AS COCODE,
         '' AS FOCODE,   
         '' AS DOCNUM,   
         '' AS DOCDATE,
         '' AS DOCTYPE,   
         ACCTENT.ACCTCODE,   
         ACCTENT.DRCR,   
         0.00 AS AMOUNT,   
         ACCTENT.UNIT,   
         ACCTENT.ORIGCY,   
         ACCTENT.LOCCY,   
         ACCTENT.LOB AS LOB,   
         ACCTENT.RECDEST,   
         ACCTENT.CONTROLNO,  
         ACCTENT.LSPACCTYPE,   
         ACCTENT.LSPORTYPE
    FROM ACCTENT
   WHERE ( TRIM( ACCTENT.COCODE ) = :ls_compcode ) and
        ( ACCTENT.ORIGCY = 'PHP') AND 
	      ( TRIM( ACCTENT.TRANTYPE ) = 'CACPAR02');
...
