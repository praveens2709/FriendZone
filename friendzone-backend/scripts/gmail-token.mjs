import http from "http";
import { URL } from "url";

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;
const port = 53682;
const redirect = `http://127.0.0.1:${port}`;

if (!clientId || !clientSecret) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
  });

console.log("Open this link in your browser and sign in with the sending account:\n");
console.log(authUrl + "\n");

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get("code");
  if (!code) {
    res.end("Waiting for the Google sign-in...");
    return;
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
  });
  const json = await response.json();
  res.end(json.refresh_token ? "Done. Go back to the terminal." : "No refresh token came back. See the terminal.");
  if (json.refresh_token) {
    console.log("GMAIL_REFRESH_TOKEN=" + json.refresh_token);
  } else {
    console.log("No refresh token returned:", JSON.stringify(json));
  }
  server.close();
});

server.listen(port, "127.0.0.1");
