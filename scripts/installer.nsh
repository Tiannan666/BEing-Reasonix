/**
 * installer.nsh — BEing Reasonix NSIS custom installer script.
 *
 * Detects Node.js >= 22 and offers to install bundled Node.js MSI if missing.
 */
!include "LogicLib.nsh"

Var NodeInstalled

; ── Check if Node.js >= 22 is available ────────────────────────────
Function CheckNodeJS
  StrCpy $NodeInstalled "0"

  ; Try running node --version
  nsExec::ExecToStack 'node --version'
  Pop $0  ; exit code
  Pop $1  ; stdout, e.g. "v22.12.0" or "v18.0.0"

  ${If} $0 != 0
    Return  ; node not found
  ${EndIf}

  ; Check if version starts with v22+, v23+, v24+...
  ; We simply look for "v2" followed by "2", "3", "4", etc.
  ; "v18" → second char after 'v' is '1' → too old
  ; "v22" → second char after 'v' is '2' → OK
  StrCpy $2 $1 1 1   ; second char (after 'v')
  ${If} $2 == "2"
    StrCpy $3 $1 1 2   ; third char
    ${If} $3 == "2"
      StrCpy $NodeInstalled "1"
    ${ElseIf} $3 == "3"
      StrCpy $NodeInstalled "1"
    ${ElseIf} $3 == "4"
      StrCpy $NodeInstalled "1"
    ${ElseIf} $3 == "5"
      StrCpy $NodeInstalled "1"
    ${ElseIf} $3 == "6"
      StrCpy $NodeInstalled "1"
    ${ElseIf} $3 == "7"
      StrCpy $NodeInstalled "1"
    ${ElseIf} $3 == "8"
      StrCpy $NodeInstalled "1"
    ${ElseIf} $3 == "9"
      StrCpy $NodeInstalled "1"
    ${EndIf}
  ${ElseIf} $2 == "3"
    ; v30+ definitely OK
    StrCpy $NodeInstalled "1"
  ${EndIf}
FunctionEnd

; ── Offer Node.js installation ─────────────────────────────────────
Function OfferNodeInstall
  FindFirst $4 $5 "$INSTDIR\resources\vendor\node-installer\node-*.msi"
  ${If} $4 != ""
    MessageBox MB_YESNO|MB_ICONINFORMATION \
      "未检测到 Node.js >= 22。$\n$\n是否安装内置的 Node.js？$\n（软件内置了运行时，也可选择跳过）" \
      IDNO skipNode
    DetailPrint "Installing Node.js..."
    ExecWait 'msiexec /i "$INSTDIR\resources\vendor\node-installer\$5" /quiet /norestart' $6
    ${If} $6 != 0
      MessageBox MB_OK|MB_ICONEXCLAMATION \
        "Node.js 安装失败（错误代码: $6）。$\n$\n软件仍可正常使用（内置了 Node.js 运行时）。"
    ${EndIf}
    Goto doneNode
    skipNode:
  ${Else}
    ; No bundled MSI found, just inform
    MessageBox MB_OK|MB_ICONINFORMATION \
      "软件内置了 Node.js 运行时，无需额外安装即可使用。"
  ${EndIf}
  doneNode:
  FindClose $4
FunctionEnd

; ── Hook: runs after install success ───────────────────────────────
Function .onInstSuccess
  Call CheckNodeJS
  ${If} $NodeInstalled == "0"
    Call OfferNodeInstall
  ${EndIf}
FunctionEnd
