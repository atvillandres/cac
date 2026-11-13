event ue_process;mailReturnCode			mRet
mailMessage		   	mMsg
mailFileDescription	mAttach
pointer oldpointer

STRING ls_filename, s_filespec = "*.dbf", ls_pathname, ls_run
INTEGER li_totalitems

w_unload.Visible = False

// Rename BRS and SSI files to DBF file format

ls_run = "command.com /c C:\CACENT~~1\ALAI\DOSBAT\MISCRENM.BAT"

RUN( ls_run, Minimized! )

imSes = create mailSession

mRet   = imSes.mailLogon ( mailNewSession! )

If mRet <> mailReturnSuccess! Then
	MessageBox ("Mail Logon", 'Return Code <> mailReturnSuccess!' )
End If

w_unload.Visible = True
hpb_email.Visible = FALSE
hpb_trans.Visible = FALSE
st_retrievemail.Visible = TRUE
st_emailproc.Visible = FALSE
st_transproc.Visible = FALSE

long n, c_row

oldpointer = SetPointer(HourGlass!)

// Process email FOCUS files here...

If mRet = mailReturnSuccess! Then

	imSes.mailGetMessages("", TRUE)

	FOR n = 1 to UpperBound(imSes.MessageID[])
		imSes.mailReadMessage(imSes.MessageID[n], &
		mMsg, mailEnvelopeOnly!, FALSE)
	
		IF LEFT( TRIM( mMsg.Subject ), 15 ) <> 'NO CAC-LSP File' AND & 
			LEFT( TRIM( mMsg.Subject ), 12 ) <> 'CAC-LSP File' THEN
			CONTINUE
		END IF

		c_row = dw_getmessage.InsertRow(0)
		dw_getmessage.SetItem(c_row, "msgid", imSes.MessageID[n])
		dw_getmessage.SetItem(c_row, "msgdate", DATE(LEFT(mMsg.DateReceived, 10)))

		dw_getmessage.SetItem(c_row, "msgsubject", Left(mMsg.Subject, 50))
	NEXT

	string 	ls_ret	
	mailreturncode mRetCd

	IF c_row = 0 THEN
		MessageBox ("Note", 'No New Messages Received' )
	ELSE
		hpb_email.Visible = TRUE
		hpb_trans.Visible = TRUE
		st_retrievemail.Visible = FALSE
		st_emailproc.Visible = TRUE
		st_transproc.Visible = TRUE

		wf_procmail()
		wf_sendmail()
	END IF

	mRetCd = imSes.mailLogoff ( )

	If mRetCd <> mailReturnSuccess! Then
   	MessageBox ("Mail Logoff", 'Return Code <> mailReturnSuccess!' )
	End If
	
	destroy imSes
END IF

// Process BRS and SSI files here...

ls_pathname = 'C:\tci\inbound'

s_filespec = "C:\tci\inbound\*.dbf"
st_filepath.Text = ls_pathname

lb_filelist.Reset()
lb_filelist.DirList(s_filespec, 16400, st_filepath)

li_totalitems = lb_filelist.TotalItems()

IF li_totalitems = 0 THEN
	MessageBox ("Note", 'No BRS/SSI Files To Process' )
ELSE
	wf_procmiscfiles()
END IF

SetPointer(oldpointer)

Close (this)
end event
