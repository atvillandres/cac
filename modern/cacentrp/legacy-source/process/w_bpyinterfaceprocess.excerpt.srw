/* Excerpt from w_bpyinterfaceprocess.srw — BPYFILE ⋈ ACCTENT */

forward
global type w_bpyinterfaceprocess from window
end type
type dw_excesscash from datawindow within w_bpyinterfaceprocess
end type
type st_process2 from statictext within w_bpyinterfaceprocess
end type
type st_read2 from statictext within w_bpyinterfaceprocess
end type
type st_4 from statictext within w_bpyinterfaceprocess
end type
type st_3 from statictext within w_bpyinterfaceprocess
end type
type dw_unbalcurrledge from datawindow within w_bpyinterfaceprocess
end type
type dw_mapaptrans from datawindow within w_bpyinterfaceprocess
end type
type hpb_1 from hprogressbar within w_bpyinterfaceprocess
end type
type st_foproc from statictext within w_bpyinterfaceprocess
end type
type st_process from statictext within w_bpyinterfaceprocess
end type
type st_read from statictext within w_bpyinterfaceprocess
end type
type st_2 from statictext within w_bpyinterfaceprocess
end type
type st_1 from statictext within w_bpyinterfaceprocess
end type
type p_1 from picture within w_bpyinterfaceprocess
end type
type st_percent from statictext within w_bpyinterfaceprocess
end type
end forward

global type w_bpyinterfaceprocess from window
integer width = 1984
integer height = 684
boolean titlebar = true
boolean controlmenu = true
windowtype windowtype = response!
long backcolor = 67108864
event type boolean ue_createacctent ( )
dw_excesscash dw_excesscash
st_process2 st_process2
st_read2 st_read2
st_4 st_4
st_3 st_3
dw_unbalcurrledge dw_unbalcurrledge
dw_mapaptrans dw_mapaptrans
hpb_1 hpb_1
st_foproc st_foproc
st_process st_process
st_read st_read
st_2 st_2

/* --- snippets --- */
/* ... around line 87 ... */

DECLARE c_mapbpytrans CURSOR FOR 
   SELECT ACCTENT.COCODE,
			'BRS' AS FOCODE,   
			 BPYFILE.INORNO,   
          BPYFILE.INDATE,   
          BPYFILE.INPSTP,
          ACCTENT.ACCTCODE,   
          ACCTENT.DRCR,   
          BPYFILE.INPAMT,   
          BPYFILE.ICDRCD,
          ACCTENT.ORIGCY,   
          ACCTENT.LOCCY,   

/* ... around line 115 ... */

DECLARE c_mapbpydep CURSOR FOR  
  SELECT ACCTENT.COCODE,   
         'BRS' AS FOCODE,   
 			BPYFILE.INORNO AS DOCNUM,   
         BPYFILE.INDATE,   
         BPYFILE.INPSTP,   
         ACCTENT.ACCTCODE,   
         ACCTENT.DRCR,   
         BPYFILE.INPAMT,   
         ACCTENT.UNIT,   
         ACCTENT.ORIGCY,   
         ACCTENT.LOCCY,   

/* ... around line 160 ... */
WHERE ( TRIM( SYRCACPARAM.COMPCODE ) = :ls_compcode ) AND  
      ( SYRCACPARAM.PARAMTYPE = 'B01' );

IF sqlca.sqlcode = 100 THEN
	MessageBox('Stop', 'Not found paramtype "B01" for Cash Balance Buffer', StopSign!, Ok!)
	RETURN FALSE
END IF
ldec_buffamt = DEC(ls_buffamt)

SELECT COUNT(*)
   INTO :ll_count1
	FROM  BPYFILE, ACCTENT
   WHERE ( TRIM( ACCTENT.COCODE ) = :ls_compcode ) and

/* ... around line 489 ... */
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
		
      UPDATE BDOAPMST SET BDOASTATUS = 'H' //Error in Trial Balance   

/* ... around line 535 ... */

		INSERT INTO "BPYFILEX"
			(  "ICDRCD",   
	         "IPOLNO",   
	         "INPLN",   
   	      "INPFN",   
	         "INPMI",   
   	      "IACTTYPE",   
      	   "INORTYPE",   
         	"IACTCD",   
	         "INPSGN",   
   	      "INPAMT",   
	         "INORNO",   

/* ... around line 512 ... */
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
		END IF
		
