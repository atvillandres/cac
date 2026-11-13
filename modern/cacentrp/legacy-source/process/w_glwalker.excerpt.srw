/* Excerpt from w_glwalker.srw — Create GL Walker Text File */
/* Full source ~200KB; this file keeps control/header/detail + file naming cues. */

forward
global type w_glwalker from window
end type
type dw_syrgbrnpcc from datawindow within w_glwalker
end type
type dw_syrgactpcc from datawindow within w_glwalker
end type
type dw_gmapdtl from datawindow within w_glwalker
end type
type dw_tdhopf from datawindow within w_glwalker
end type
type dw_nopdpf from datawindow within w_glwalker
end type
type dw_glwgissum from datawindow within w_glwalker
end type
type dw_glwhdr4glwmba from datawindow within w_glwalker
end type
type dw_glwlspsum from datawindow within w_glwalker
end type
type dw_bpytrans from datawindow within w_glwalker
end type
type dw_glwrefdoc from datawindow within w_glwalker
end type
type dw_glwpayor from datawindow within w_glwalker
end type
type dw_glwdetails from datawindow within w_glwalker
end type
type st_dtlrec from statictext within w_glwalker
end type
type st_hdrrec from statictext within w_glwalker
end type
type st_ctrlrec from statictext within w_glwalker
end type
type dw_unmatched_procrep from datawindow within w_glwalker
end type
type dw_unmatched_excptrep from datawindow within w_glwalker
end type
type dw_glwprooflist from datawindow within w_glwalker
end type
type st_comp from statictext within w_glwalker
end type
type dw_glwgrpnumber from datawindow within w_glwalker
end type
type sle_nlspread from singlelineedit within w_glwalker
end type
type st_4 from statictext within w_glwalker
end type
type sle_nlspcount from singlelineedit within w_glwalker
end type
type st_3 from statictext within w_glwalker
end type
type sle_lspread from singlelineedit within w_glwalker
end type
type sle_lspcount from singlelineedit within w_glwalker
end type
type st_lspwritten from statictext within w_glwalker
end type
type st_lspread from statictext within w_glwalker
end type
type st_percent from statictext within w_glwalker

/* --- snippets --- */

/* ... around line 264 (wf_nlspdetails) ... */
public function boolean wf_tdhodetails (string ls_cocode)
public function boolean wf_createheader ()
public function boolean wf_nlspdetails (string ls_cocode, date ldte_procdate, string ls_fieldcode, date ldte_refdate, string ls_grpnumber, string ls_jrnnumber)
public function boolean wf_lspdetails (string ls_cocode)
end prototypes

public function boolean wf_createtxtfile (string ls_arg_filename);LONG          ll_cntrlrowcnt, ll_hdrrowcnt, ll_dtlrowcnt, ll_written
LONG          ll_cntrlctr, ll_hdrctr, ll_dtlctr, ll_begrow, ll_details
STRING        ls_linerec, ls_gwctle, ls_gwgrpn, ls_gwgrpd, ls_filter, ls_gwactc, ls_gwdccd
STRING        ls_gwcurr

/* ... around line 2784 (wf_lspdetails) ... */
end function

public function boolean wf_lspdetails (string ls_cocode);// Date of Last Revision: Oct. 17, 2001
// Purpose: Assign 'X001' for Blank Unit Code --> ls_gwcntr
// As discussed with J. Isidoro

STRING     ls_gwrect,ls_gwctle,ls_gwgrpn,ls_gwjrnn, &
	        ls_gwfil1,ls_gwcmpy,ls_gwactc,ls_gwcurr,ls_gwcntr, &
           ls_gwlobc,ls_gwdccd,ls_gwtrnc,ls_gwref1, &
		     ls_gwref2,ls_gwref3,ls_gwref4,ls_gwencs,ls_gwrtts, &

/* ... around line 4181 (H.GLW) ... */
		CASE 1 /*AHCI*/
			ls_cocode        = 'AHCI'
			ls_filename = 'C:\CACENT~~1\GLWALKER\' + STRING( ldte_processdate, 'mmddyy' ) + 'H.GLW'
		CASE 2 /*ALAI*/
			ls_cocode        = 'ALAI'
			ls_filename = 'C:\CACENT~~1\GLWALKER\' + STRING( ldte_processdate, 'mmddyy' ) + 'A.GLW'
			
			dw_bpytrans.settransobject(SQLCA)
			dw_bpytrans.retrieve( STRING( ldte_processdate, 'YYYYMMDD' ) )
			

/* ... around line 4191 (P.GLW) ... */
		CASE 3 /*APLN*/
			ls_cocode        = 'APLN'
			ls_filename = 'C:\CACENT~~1\GLWALKER\' + STRING( ldte_processdate, 'mmddyy' ) + 'P.GLW'			
			dw_glwpayor.settransobject(SQLCA)
			dw_glwrefdoc.settransobject(SQLCA)
			
			st_comp.text     = ls_cocode
			st_remarks.text  = "Datawindow Initialize..."
			
			dw_glwpayor.Retrieve()

/* ... around line 112 (gwrect) ... */

type str_glwdtl from structure
	string		gwrect
	string		gwctle
	string		gwgrpn
	string		gwgrpd
	string		gwjrnn
	string		gwjrnd
	string		gwseqn
	string		gwfil1
