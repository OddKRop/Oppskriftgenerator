// Appen markerer servermoduler med `import "server-only"`. Pakken finnes ikke i
// node_modules — Next aliaser den bort under bygget — og den ekte pakken kaster
// med vilje utenfor react-server-conditionen. Harnessen kjører modulene i vanlig
// Node, så resolve-hooken peker importen hit i stedet. Med vilje tom.
export {};
