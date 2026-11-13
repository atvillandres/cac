/* Excerpt from w_grpinterfaceprocess.srw — GRPFILE ⋈ ACCTENT (SSI) */

forward
global type w_grpinterfaceprocess from window
end type
type dw_excesscash from datawindow within w_grpinterfaceprocess
end type
type st_3 from statictext within w_grpinterfaceprocess
end type
type dw_unbalcurrledge from datawindow within w_grpinterfaceprocess
end type
type dw_mapaptrans from datawindow within w_grpinterfaceprocess
end type
type hpb_1 from hprogressbar within w_grpinterfaceprocess
end type
type st_foproc from statictext within w_grpinterfaceprocess
end type
type st_process from statictext within w_grpinterfaceprocess
end type
type st_read from statictext within w_grpinterfaceprocess
end type
type st_1 from statictext within w_grpinterfaceprocess
end type
type p_1 from picture within w_grpinterfaceprocess
end type
type st_percent from statictext within w_grpinterfaceprocess
end type
end forward

global type w_grpinterfaceprocess from window
integer width = 1984
integer height = 684
boolean titlebar = true
boolean controlmenu = true
windowtype windowtype = response!
long backcolor = 67108864
event type boolean ue_createacctent ( )
dw_excesscash dw_excesscash
st_3 st_3
dw_unbalcurrledge dw_unbalcurrledge
dw_mapaptrans dw_mapaptrans
hpb_1 hpb_1
st_foproc st_foproc
st_process st_process
st_read st_read
st_1 st_1
p_1 p_1

/* --- snippets --- */
/* ... around line 75 ... */

DECLARE c_mapgrptrans CURSOR FOR 
   SELECT ACCTENT.COCODE,
	       'SSI' AS FOCODE,   
	       GRPFILE.IPOLNO,   
          GRPFILE.INDATE,   
          GRPFILE.INPSTP,
          ACCTENT.ACCTCODE,   
          ACCTENT.DRCR,   
          GRPFILE.INPAMT,   
          GRPFILE.ICDRCD,

/* ... around line 101 ... */
			 ( ACCTENT.TRANTYPE = GRPFILE.DTLTYPE ) 
	 ORDER BY GRPFILE.IPOLNO, 
	          ACCTENT.TRANTYPE ;

lstr_procvar = Message.powerobjectparm
ls_compcode = gstr_proccdrvar.compcode
ls_focode   = gstr_proccdrvar.focode
//ld_trandate = gstr_proccdrvar.daterec
ls_filename = gstr_proccdrvar.filename
ld_trandate = f_miscfiledate(ls_filename) 
ld_today    = TODAY()

/* ... around line 96 ... */
		    ACCTENT.UNIT	,
			 GRPFILE.INPENT
	 FROM  GRPFILE, 
	       ACCTENT
    WHERE ( TRIM( ACCTENT.COCODE ) = :ls_compcode ) and
			 ( ACCTENT.TRANTYPE = GRPFILE.DTLTYPE ) 
	 ORDER BY GRPFILE.IPOLNO, 
	          ACCTENT.TRANTYPE ;

lstr_procvar = Message.powerobjectparm
ls_compcode = gstr_proccdrvar.compcode

/* ... around line 329 ... */
IF dw_mapaptrans.rowcount() > 0 THEN
	IF ldec_balcashcr <> ldec_balcashdr THEN
	   ls_printfile = 'C:\CACENT~~1\ALAI\REPORTS\' + ls_filename + '.HTM'
   	dw_mapaptrans.SaveAs( ls_printfile, HTMLTable!, TRUE)
		
	   dw_mapaptrans.RowsCopy(1, dw_mapaptrans.RowCount(), Primary!, dw_unbalcurrledge, 1, Primary!)
		IF dw_unbalcurrledge.Update() <> 1 THEN
			MessageBox("DataWindow Error: dw_unbalcurrledge","Error in UPDATE~r~nContact your system administrator")
			ROLLBACK USING SQLCA;
	      RETURN FALSE	
		END IF

/* ... around line 375 ... */
		
		INSERT INTO "GRPFILEX"
			( "ICDRCD",   
           "IPOLNO",   
   	     "INPLN",   
      	  "INPFN",   
           "INPMI",   
	        "IACTTYPE",   
	        "INORTYPE",   
   	     "IACTCD",   
	        "INPSGN",   

/* ... around line 352 ... */
   ELSE
	   UPDATE BDOAPMST SET BDOASTATUS = 'L'  // "L" = Process Complete 
         WHERE ( TRIM( BDOAPMST.BDOACOMPCD ) = :ls_compcode  ) AND  
               ( TRIM( BDOAPMST.BDOACODE )  = :ls_focode ) AND  
               ( BDOAPMST.BDOPROCDTE = :ld_today )  AND
  			      ( BDOAPMST.BDOSUBFILE = :ls_filename);
					  
		IF sqlca.sqlcode <> 0 THEN
			MessageBox("Update Error: BDOAPMST", SQLCA.SQLErrText )
			ROLLBACK USING SQLCA;
      	RETURN FALSE	
