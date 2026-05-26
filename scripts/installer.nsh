!include "LogicLib.nsh"
!include "FileFunc.nsh"

Var NodeInstalled
Var NpmPath

; ── Check Node.js ────────────────────────────────────────────────
Function CheckNodeJS
  StrCpy $NodeInstalled "0"
  StrCpy $NpmPath ""

  ; Try running node --version
  nsExec::ExecToStack 'node --version'
  Pop $0
  Pop $1
  ${If} $0 == 0
    StrCpy $2 $1 1 1
    ${If} $2 == "2"
      StrCpy $3 $1 1 2
      ${If} $3 >= "2"
        StrCpy $NodeInstalled "1"
      ${EndIf}
    ${ElseIf} $2 == "3"
      StrCpy $NodeInstalled "1"
    ${EndIf}
  ${EndIf}

  ; Find npm — check common install paths
  ${If} ${FileExists} "$PROGRAMFILES64\nodejs\npm.cmd"
    StrCpy $NpmPath "$PROGRAMFILES64\nodejs\npm.cmd"
  ${ElseIf} ${FileExists} "$PROGRAMFILES32\nodejs\npm.cmd"
    StrCpy $NpmPath "$PROGRAMFILES32\nodejs\npm.cmd"
  ${ElseIf} ${FileExists} "$LOCALAPPDATA\Programs\nodejs\npm.cmd"
    StrCpy $NpmPath "$LOCALAPPDATA\Programs\nodejs\npm.cmd"
  ${EndIf}
FunctionEnd

; ── Install Node.js ────────────────────────────────────────────
Function InstallBundledNode
  FindFirst $4 $5 "$INSTDIR\resources\vendor\node-installer\node-*.msi"
  ${If} $4 == ""
    MessageBox MB_OK|MB_ICONINFORMATION "未找到内置 Node.js 安装包。"
    Return
  ${EndIf}

  MessageBox MB_YESNO|MB_ICONINFORMATION \
    "未检测到 Node.js >= 22。$\n是否安装内置的 Node.js 24？" IDNO skip

  DetailPrint "Installing Node.js 24..."
  SetDetailsView show
  ExecWait 'msiexec /i "$INSTDIR\resources\vendor\node-installer\$5" /quiet /norestart' $6
  FindClose $4

  ${If} $6 == 0
    DetailPrint "Node.js installed."
    ; After MSI, npm is at PROGRAMFILES64\nodejs\npm.cmd
    StrCpy $NpmPath "$PROGRAMFILES64\nodejs\npm.cmd"
  ${Else}
    MessageBox MB_OK|MB_ICONEXCLAMATION "Node.js 安装失败（$6）。软件仍可使用内置运行时。"
  ${EndIf}
  Goto done
  skip:
  FindClose $4
  done:
FunctionEnd

; ── Install reasonix ───────────────────────────────────────────
Function InstallReasonix
  ${If} $NpmPath == ""
    DetailPrint "npm not found, will install reasonix at first launch."
    Return
  ${EndIf}

  DetailPrint "Installing reasonix globally..."
  nsExec::ExecToLog '"$NpmPath" install -g reasonix --loglevel=error'
  Pop $0
  ${If} $0 == 0
    DetailPrint "Reasonix installed."
  ${Else}
    DetailPrint "npm install failed (exit $0), will retry at app launch."
  ${EndIf}
FunctionEnd

; ── Hook ─────────────────────────────────────────────────────────
Function .onInstSuccess
  Call CheckNodeJS
  ${If} $NodeInstalled == "0"
    Call InstallBundledNode
  ${EndIf}
  Call InstallReasonix
FunctionEnd
