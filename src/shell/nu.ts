export function emitNuInit(programPath: string): string {
  return `export def cmdgen [...query: string] {
  let joined = ($query | str join " ")
  let history_entries = (
    history
    | reverse
    | first 3
    | get command
    | where {|entry| ($entry | str trim | is-not-empty) }
  )
  ^${programPath} generate --shell nu --cwd $env.PWD ...(
    $history_entries | each {|entry| ["--history-entry", $entry] } | flatten
  ) -- $joined
}

export alias d = cmdgen
`;
}
