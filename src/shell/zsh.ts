import { quoteForPosixShell } from "./shared";

export function emitZshInit(programPath: string): string {
  const quotedProgramPath = quoteForPosixShell(programPath);

  return `cmdgen() {
  emulate -L zsh
  setopt NO_GLOB

  local query="$*"
  local -a history_entries
  history_entries=("\${(@f)$(fc -ln -3 | sed '/^[[:space:]]*$/d')}")

  local -a cmd=(${quotedProgramPath} generate --shell zsh --cwd "$PWD")
  local entry
  for entry in "\${history_entries[@]}"; do
    cmd+=(--history-entry "$entry")
  done
  cmd+=(-- "$query")

  local generated
  generated=$("\${cmd[@]}") || return $?
  if [[ -z "$generated" ]]; then
    print -u2 -- "No command generated"
    return 1
  fi

  print -z -- "$generated"
}

d() {
  cmdgen "$@"
}
`;
}
