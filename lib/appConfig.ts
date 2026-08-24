// Shared app constants. The team password gates the app (client-side, soft)
// and doubles as the bearer token the sync layer sends to the cloud store.
// It necessarily ships in the app — this keeps casual visitors out, not
// determined ones. Change it in one place here.
export const TEAM_PASSWORD = "wanneroo10";
